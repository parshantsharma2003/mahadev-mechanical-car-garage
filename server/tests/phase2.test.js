import assert from 'assert';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { User, AuditLog } from '../src/models/index.js';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  signAuthToken
} from '../src/utils/security.js';

dotenv.config();

const TEST_PORT = 5066;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Helper: parse set-cookie headers from response
function extractCookies(res) {
  let rawCookies = [];
  if (typeof res.headers.getSetCookie === 'function') {
    rawCookies = res.headers.getSetCookie();
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) rawCookies = [raw];
  }

  const cookies = {};
  for (const c of rawCookies) {
    const main = c.split(';')[0];
    const idx = main.indexOf('=');
    if (idx !== -1) {
      const k = main.slice(0, idx).trim();
      const v = main.slice(idx + 1).trim();
      cookies[k] = v;
    }
  }
  return cookies;
}

// Helper: build Cookie string for request headers
function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 2 TEST SUITE            ');
  console.log('======================================================\n');

  let serverInstance = null;
  let passedTests = 0;
  let totalTests = 0;

  const test = async (name, fn) => {
    totalTests++;
    process.stdout.write(`[Test ${totalTests}] ${name} ... `);
    try {
      await fn();
      console.log('PASS');
      passedTests++;
    } catch (err) {
      console.log('FAIL');
      console.error(`   Error: ${err.message}`);
      throw err;
    }
  };

  try {
    await connectDB();

    serverInstance = await new Promise((resolve) => {
      const s = app.listen(TEST_PORT, () => resolve(s));
    });

    // Clean up any existing test users from prior runs
    await User.deleteMany({ email: /.*_p2@mahadev\.com$/ });

    // Seed test OWNER account
    const ownerPassword = 'OwnerPass#2026';
    const ownerHash = await bcrypt.hash(ownerPassword, 12);
    const testOwner = await User.create({
      fullName: 'Test Owner P2',
      email: 'owner_p2@mahadev.com',
      passwordHash: ownerHash,
      role: 'OWNER',
      phone: '8295669463',
      isActive: true,
      tokenVersion: 0
    });

    // Seed test SUPER_ADMIN account
    const superPassword = 'SuperPass#2026';
    const superHash = await bcrypt.hash(superPassword, 12);
    const testSuperAdmin = await User.create({
      fullName: 'Test Super Admin P2',
      email: 'superadmin_p2@mahadev.com',
      passwordHash: superHash,
      role: 'SUPER_ADMIN',
      phone: '9812345678',
      isActive: true,
      tokenVersion: 0,
      createdBy: testOwner._id
    });

    // Seed test Inactive SUPER_ADMIN account
    const testInactive = await User.create({
      fullName: 'Inactive Super Admin P2',
      email: 'inactive_p2@mahadev.com',
      passwordHash: superHash,
      role: 'SUPER_ADMIN',
      phone: '9812987654',
      isActive: false,
      tokenVersion: 0,
      createdBy: testOwner._id
    });

    // State preserved across tests
    let ownerCookies = {};
    let ownerCsrfToken = '';
    let superCookies = {};
    let superCsrfToken = '';

    // 1. Successful OWNER login
    await test('1. Successful OWNER login', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'owner_p2@mahadev.com', password: ownerPassword })
      });

      assert.strictEqual(res.status, 200, 'Login should return 200');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, 'OWNER');
      assert.strictEqual(json.data.user.email, 'owner_p2@mahadev.com');
      assert.ok(json.data.csrfToken, 'CSRF token must be returned in response data');

      ownerCookies = extractCookies(res);
      assert.ok(ownerCookies[AUTH_COOKIE_NAME], 'Auth cookie must be present in response');
      assert.ok(ownerCookies[CSRF_COOKIE_NAME], 'CSRF cookie must be present in response');
      assert.strictEqual(ownerCookies[CSRF_COOKIE_NAME], json.data.csrfToken, 'Cookie and body CSRF tokens must match');
      ownerCsrfToken = json.data.csrfToken;
    });

    // 2. Successful SUPER_ADMIN login
    await test('2. Successful SUPER_ADMIN login', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'superadmin_p2@mahadev.com', password: superPassword })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, 'SUPER_ADMIN');

      superCookies = extractCookies(res);
      assert.ok(superCookies[AUTH_COOKIE_NAME]);
      assert.ok(superCookies[CSRF_COOKIE_NAME]);
      superCsrfToken = json.data.csrfToken;
    });

    // 3. Incorrect password
    await test('3. Incorrect password rejected with generic 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'owner_p2@mahadev.com', password: 'WrongPassword999' })
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'INVALID_CREDENTIALS');
      assert.strictEqual(json.error.message, 'Invalid email or password.');
    });

    // 4. Unknown email
    await test('4. Unknown email rejected with generic 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'nonexistent_user@mahadev.com', password: 'SomePassword123' })
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'INVALID_CREDENTIALS');
      assert.strictEqual(json.error.message, 'Invalid email or password.');
    });

    // 5. Inactive account login
    await test('5. Inactive account login rejected with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'inactive_p2@mahadev.com', password: superPassword })
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'ACCOUNT_INACTIVE');
    });

    // 6. Missing authentication cookie
    await test('6. Missing authentication cookie rejected with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'UNAUTHENTICATED');
    });

    // 7. Invalid JWT
    await test('7. Invalid JWT rejected with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=malformed.fake.token` }
      });
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'INVALID_TOKEN');
    });

    // 8. Expired JWT
    await test('8. Expired JWT rejected with 401', async () => {
      const expiredToken = signAuthToken(
        { userId: testOwner._id.toString(), role: 'OWNER', tokenVersion: 0 },
        '-10s' // Expired 10 seconds ago
      );
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${expiredToken}` }
      });
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'TOKEN_EXPIRED');
    });

    // 9. TokenVersion mismatch
    await test('9. TokenVersion mismatch rejected with 401', async () => {
      const staleToken = signAuthToken(
        { userId: testOwner._id.toString(), role: 'OWNER', tokenVersion: 99 },
        '1h'
      );
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${staleToken}` }
      });
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'SESSION_REVOKED');
    });

    // 10. Successful logout and invalidated session
    await test('10. Successful logout and invalidated session', async () => {
      // First verify session is valid
      const meBefore = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      assert.strictEqual(meBefore.status, 200);

      // Perform logout
      const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrfToken
        }
      });
      assert.strictEqual(logoutRes.status, 200);

      // Now verify that the previous token is instantly revoked on server
      const meAfter = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      assert.strictEqual(meAfter.status, 401, 'Logged-out session must return 401');
      const jsonAfter = await meAfter.json();
      assert.strictEqual(jsonAfter.error.code, 'SESSION_REVOKED');

      // Re-login owner to restore session for subsequent tests
      const reLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'owner_p2@mahadev.com', password: ownerPassword })
      });
      const reLoginJson = await reLogin.json();
      ownerCookies = extractCookies(reLogin);
      ownerCsrfToken = reLoginJson.data.csrfToken;
    });

    // 11. Successful password change
    await test('11. Successful password change updates hash and issues fresh session', async () => {
      const newPassword = 'NewSuperPassword#2026';
      const res = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrfToken
        },
        body: JSON.stringify({ currentPassword: superPassword, newPassword })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);

      // Update superCookies with the fresh cookies issued upon password change
      const freshCookies = extractCookies(res);
      if (freshCookies[AUTH_COOKIE_NAME]) {
        superCookies = freshCookies;
        superCsrfToken = json.data.csrfToken;
      }
    });

    // 12. Old password rejected after password change
    await test('12. Old password rejected, new password accepted', async () => {
      // Old password must fail
      const oldRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'superadmin_p2@mahadev.com', password: superPassword })
      });
      assert.strictEqual(oldRes.status, 401);

      // New password must succeed
      const newRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email: 'superadmin_p2@mahadev.com', password: 'NewSuperPassword#2026' })
      });
      assert.strictEqual(newRes.status, 200);
      const newJson = await newRes.json();
      superCookies = extractCookies(newRes);
      superCsrfToken = newJson.data.csrfToken;
    });

    // 13. OWNER can create a SUPER_ADMIN
    let createdAdminId = null;
    await test('13. OWNER can create a SUPER_ADMIN account', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrfToken
        },
        body: JSON.stringify({
          fullName: 'Created Super Admin P2',
          email: 'created_admin_p2@mahadev.com',
          password: 'CreatedPassword#2026',
          phone: '9812999888'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, 'SUPER_ADMIN');
      assert.strictEqual(json.data.user.email, 'created_admin_p2@mahadev.com');
      createdAdminId = json.data.user.id;
    });

    // 14. SUPER_ADMIN cannot create a privileged account
    await test('14. SUPER_ADMIN cannot create a privileged account (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrfToken
        },
        body: JSON.stringify({
          fullName: 'Illegal Admin',
          email: 'illegal_p2@mahadev.com',
          password: 'SomePassword#2026'
        })
      });

      assert.strictEqual(res.status, 403, 'SUPER_ADMIN should receive 403 on user creation');
      const json = await res.json();
      assert.strictEqual(json.error.code, 'FORBIDDEN');
    });

    // 15. SUPER_ADMIN receives 403 on OWNER-only routes
    await test('15. SUPER_ADMIN receives 403 on OWNER-only list endpoint', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'FORBIDDEN');
    });

    // 16. OWNER cannot deactivate the last active OWNER
    await test('16. Attempt to deactivate OWNER account is blocked (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users/${testOwner._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrfToken
        },
        body: JSON.stringify({ isActive: false })
      });

      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'FORBIDDEN_OPERATION');
    });

    // 17. Missing CSRF token rejected
    await test('17. Missing CSRF token rejected on state-changing route (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies)
          // Missing X-CSRF-Token header
        },
        body: JSON.stringify({
          fullName: 'No CSRF Admin',
          email: 'no_csrf_p2@mahadev.com',
          password: 'Password#2026'
        })
      });

      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'CSRF_MISSING');
    });

    // 18. Invalid CSRF token rejected
    await test('18. Invalid CSRF token rejected (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': 'bogus_csrf_token_value_that_does_not_match'
        },
        body: JSON.stringify({
          fullName: 'Bad CSRF Admin',
          email: 'bad_csrf_p2@mahadev.com',
          password: 'Password#2026'
        })
      });

      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'CSRF_INVALID');
    });

    // 19. Valid CSRF token accepted
    await test('19. Valid CSRF token accepted on state-changing route (200)', async () => {
      assert.ok(createdAdminId);
      const res = await fetch(`${BASE_URL}/api/v1/admin/users/${createdAdminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrfToken
        },
        body: JSON.stringify({
          fullName: 'Updated Name Super Admin P2',
          phone: '9812999777'
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.fullName, 'Updated Name Super Admin P2');
    });

    // 20. Login rate limiting works
    await test('20. Login rate limiting blocks after 5 rapid failed attempts (429)', async () => {
      // Clear bypass header to trigger actual rate limiter
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'rate_test_p2@mahadev.com', password: 'wrong' })
          })
        );
      }

      // The 6th attempt should be blocked by express-rate-limit
      const lastRes = attempts[5];
      assert.strictEqual(lastRes.status, 429, '6th attempt must return HTTP 429');
      const json = await lastRes.json();
      assert.strictEqual(json.error.code, 'RATE_LIMIT_EXCEEDED');
    });

    // 21. Audit records are created for privileged operations
    await test('21. Audit records are verified for security operations', async () => {
      const actions = await AuditLog.find({
        actorId: testOwner._id
      }).distinct('action');

      assert.ok(actions.includes('LOGIN_SUCCESS'), 'Must log LOGIN_SUCCESS');
      assert.ok(actions.includes('USER_CREATED'), 'Must log USER_CREATED');
      assert.ok(actions.includes('USER_UPDATED'), 'Must log USER_UPDATED');
    });

    // 22. API responses never expose password hashes or tokens
    await test('22. API responses never expose password hashes or internal secrets', async () => {
      const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const meJson = await meRes.json();
      assert.strictEqual(meJson.data.user.passwordHash, undefined, 'passwordHash must never be exposed');
      assert.strictEqual(meJson.data.user.password, undefined);

      const listRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const listJson = await listRes.json();
      for (const u of listJson.data.users) {
        assert.strictEqual(u.passwordHash, undefined, 'passwordHash must never be exposed in list');
        assert.strictEqual(u.password, undefined);
      }
    });

    // 23. Stale role claims in JWT are strictly rejected
    await test('23. Stale role claim in JWT rejected with 401 ROLE_MISMATCH', async () => {
      // Fetch current tokenVersion from DB for testSuperAdmin
      const freshSuperAdmin = await User.findById(testSuperAdmin._id);
      assert.ok(freshSuperAdmin);

      // Craft a token claiming role: OWNER for a user who is actually SUPER_ADMIN in DB
      const elevatedToken = signAuthToken(
        {
          userId: freshSuperAdmin._id.toString(),
          role: 'OWNER', // Stale or elevated claim
          tokenVersion: freshSuperAdmin.tokenVersion
        },
        '1h'
      );

      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${elevatedToken}` }
      });

      assert.strictEqual(res.status, 401, 'Mismatched role claim must return 401');
      const json = await res.json();
      assert.strictEqual(json.error.code, 'ROLE_MISMATCH');
    });

    // 24. Untrusted Origin header rejected on state-changing requests
    await test('24. Untrusted Origin header rejected on state-changing request (403 UNTRUSTED_ORIGIN)', async () => {
      assert.ok(createdAdminId);
      const res = await fetch(`${BASE_URL}/api/v1/admin/users/${createdAdminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrfToken,
          Origin: 'https://malicious-phishing-attacker.com' // Untrusted cross-origin
        },
        body: JSON.stringify({ fullName: 'Hacked Admin' })
      });

      assert.strictEqual(res.status, 403, 'Untrusted origin must return 403');
      const json = await res.json();
      assert.ok(
        json.error.code === 'UNTRUSTED_ORIGIN' || json.error.code === 'CORS_ORIGIN_BLOCKED',
        `Expected origin rejection error code, got: ${json.error.code}`
      );
    });

    // 25. Trusted Origin header accepted on state-changing requests
    await test('25. Trusted Origin header accepted on state-changing request (200 OK)', async () => {
      assert.ok(createdAdminId);
      const res = await fetch(`${BASE_URL}/api/v1/admin/users/${createdAdminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrfToken,
          Origin: 'http://localhost:5173' // Explicitly allowed origin
        },
        body: JSON.stringify({ fullName: 'Verified Super Admin P2' })
      });

      assert.strictEqual(res.status, 200, 'Allowed origin must return 200');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.fullName, 'Verified Super Admin P2');
    });

    // 26. SUPER_ADMIN cannot call password reset on privileged accounts
    await test('26. SUPER_ADMIN cannot call password reset on privileged accounts (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/users/${testOwner._id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrfToken
        },
        body: JSON.stringify({ newPassword: 'HackedPassword#2026' })
      });

      assert.strictEqual(res.status, 403, 'SUPER_ADMIN must be blocked from reset-password endpoint');
      const json = await res.json();
      assert.strictEqual(json.error.code, 'FORBIDDEN');
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} PHASE 2 TESTS PASSED SUCCESSFULLY! `);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    // Clean up test records
    try {
      await User.deleteMany({ email: /.*_p2@mahadev\.com$/ });
    } catch {
      // Ignore cleanup error
    }
    await disconnectDB();
  }
}

runPhase2Tests().catch((err) => {
  console.error('\n[Phase 2 Test Suite Aborted]:', err);
  process.exit(1);
});
