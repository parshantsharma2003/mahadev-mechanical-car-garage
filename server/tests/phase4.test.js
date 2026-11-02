import assert from 'assert';
import crypto from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import {
  User,
  Customer,
  Vehicle,
  Appointment,
  Enquiry,
  Service,
  GalleryItem,
  Review,
  BusinessSetting,
  AuditLog
} from '../src/models/index.js';

dotenv.config();

const TEST_PORT = 5068;
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

async function runPhase4Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 4 TEST SUITE            ');
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

    // Start Express HTTP Test Server
    await new Promise((resolve) => {
      serverInstance = app.listen(TEST_PORT, resolve);
    });

    // Setup Admin Test Users (OWNER and SUPER_ADMIN)
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);

    await User.deleteMany({ email: { $in: ['p4owner@test.com', 'p4super@test.com'] } });

    const ownerUser = await User.create({
      fullName: 'Phase 4 Owner',
      email: 'p4owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      phone: '9844444444',
      isActive: true,
      tokenVersion: 0
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 4 Super Admin',
      email: 'p4super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      phone: '9855555555',
      isActive: true,
      tokenVersion: 0
    });

    // Helper: Admin login to obtain cookies & CSRF
    const loginUser = async (email, password = 'TestPass123!') => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
        body: JSON.stringify({ email, password })
      });
      const cookies = extractCookies(res);
      const json = await res.json();
      return { cookies, csrfToken: json.data?.csrfToken, user: json.data?.user };
    };

    // Clean up any test fixtures from previous test runs
    await Customer.deleteMany({ mobileNumber: { $in: ['9871112233', '9872223344', '9873334455'] } });
    await Vehicle.deleteMany({ registrationNumberClean: { $in: ['HR11TEST01', 'HR11TEST02'] } });
    await Service.deleteMany({ slug: 'japanese-decarbonization-service' });
    await GalleryItem.deleteMany({ title: '3D Wheel Alignment Machine In Action' });
    await Review.deleteMany({ customerName: 'Anil Hooda' });

    const ownerAuth = await loginUser('p4owner@test.com');
    const superAdminAuth = await loginUser('p4super@test.com');

    // ----------------------------------------------------
    // TEST 1: Dashboard Stats KPI Calculation
    // ----------------------------------------------------
    await test('1. Dashboard operational stats calculations & KPIs', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/dashboard/stats`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.kpi);
      assert.strictEqual(typeof json.data.kpi.totalBookingsThisWeek, 'number');
      assert.strictEqual(typeof json.data.kpi.pendingBookingsCount, 'number');
      assert.strictEqual(typeof json.data.kpi.confirmedTodayCount, 'number');
      assert.strictEqual(typeof json.data.kpi.unresolvedEnquiriesCount, 'number');
      assert.ok(json.data.statusDistribution);
      assert.ok(Array.isArray(json.data.todayAppointments));
      assert.ok(Array.isArray(json.data.recentBookings));
      assert.ok(Array.isArray(json.data.recentEnquiries));
      assert.ok(Array.isArray(json.data.recentActivity)); // OWNER gets activity
    });

    // ----------------------------------------------------
    // TEST 2: Unauthenticated Rejected on Dashboard Stats
    // ----------------------------------------------------
    await test('2. Unauthenticated user rejected on dashboard stats (401)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/dashboard/stats`);
      assert.strictEqual(res.status, 401);
    });

    // ----------------------------------------------------
    // TEST 3: Customer Management - List & Search
    // ----------------------------------------------------
    let testCustomerId = '';
    await test('3. Customer list and search with pagination', async () => {
      // Seed a customer for testing
      const customer = await Customer.create({
        fullName: 'Phase 4 Test Customer',
        mobileNumber: '9871112233',
        email: 'p4customer@test.com',
        city: 'Gohana',
        address: 'Rohtak Road'
      });
      testCustomerId = customer._id.toString();

      const res = await fetch(`${BASE_URL}/api/v1/admin/customers?search=Phase 4 Test`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.pagination.total >= 1);
      const found = json.data.find((c) => c._id === testCustomerId);
      assert.ok(found);
      assert.strictEqual(found.fullName, 'Phase 4 Test Customer');
    });

    // ----------------------------------------------------
    // TEST 4: Customer Dossier with Linked Vehicles & Appointments
    // ----------------------------------------------------
    await test('4. Customer dossier retrieval with linked vehicles and history', async () => {
      // Create a linked vehicle
      const vehicle = await Vehicle.create({
        customerId: testCustomerId,
        brand: 'Hyundai',
        model: 'Creta',
        registrationNumberClean: 'HR11TEST01',
        registrationNumberDisplay: 'HR 11 TEST 01'
      });

      const res = await fetch(`${BASE_URL}/api/v1/admin/customers/${testCustomerId}`, {
        headers: { Cookie: cookieHeader(superAdminAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.fullName, 'Phase 4 Test Customer');
      assert.ok(Array.isArray(json.data.vehicles));
      assert.ok(json.data.vehicles.length >= 1);
      assert.strictEqual(json.data.vehicles[0].registrationNumberClean, 'HR11TEST01');
    });

    // ----------------------------------------------------
    // TEST 5: Customer Update with Audit Logging
    // ----------------------------------------------------
    await test('5. Customer update with audit logging and mobile uniqueness check', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/customers/${testCustomerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          fullName: 'Phase 4 Test Customer Renamed',
          internalNotes: 'Prefers synthetic engine oil'
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.fullName, 'Phase 4 Test Customer Renamed');
      assert.strictEqual(json.data.internalNotes, 'Prefers synthetic engine oil');

      // Verify audit record
      const audit = await AuditLog.findOne({
        entityType: 'Customer',
        entityId: testCustomerId,
        action: 'CUSTOMER_UPDATED'
      });
      assert.ok(audit, 'Audit log must record customer update');
    });

    // ----------------------------------------------------
    // TEST 6: Vehicle List & Filter
    // ----------------------------------------------------
    let testVehicleId = '';
    await test('6. Vehicle listing and search', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/vehicles?search=HR11TEST01`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.length >= 1);
      testVehicleId = json.data[0]._id;
      assert.strictEqual(json.data[0].registrationNumberClean, 'HR11TEST01');
    });

    // ----------------------------------------------------
    // TEST 7: Vehicle Plate Conflict Protection
    // ----------------------------------------------------
    await test('7. Vehicle plate update conflict protection (409 Conflict)', async () => {
      // Create another vehicle
      const otherVehicle = await Vehicle.create({
        customerId: testCustomerId,
        brand: 'Maruti',
        model: 'Swift',
        registrationNumberClean: 'HR11TEST02',
        registrationNumberDisplay: 'HR 11 TEST 02'
      });

      // Try updating otherVehicle to have testVehicleId's plate
      const res = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${otherVehicle._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          registrationNumber: 'HR 11 TEST 01' // already exists on testVehicleId
        })
      });
      assert.strictEqual(res.status, 409, 'Should return 409 Conflict on plate collision');
      const json = await res.json();
      assert.strictEqual(json.error.code, 'REGISTRATION_EXISTS');
    });

    // ----------------------------------------------------
    // TEST 8: Explicit Audited Vehicle Ownership Transfer
    // ----------------------------------------------------
    await test('8. Silent vehicle reassignment blocked, explicit transfer accepted', async () => {
      const customer2 = await Customer.create({
        fullName: 'Second Customer',
        mobileNumber: '9872223344',
        city: 'Gohana'
      });

      // Attempt silent reassignment without confirm flag -> 400
      const silentRes = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${testVehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerId: customer2._id.toString()
          // missing confirmOwnershipTransfer and transferReason
        })
      });
      assert.strictEqual(silentRes.status, 400, 'Silent vehicle reassignment must be blocked');

      // Valid explicit transfer
      const transferRes = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${testVehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerId: customer2._id.toString(),
          confirmOwnershipTransfer: true,
          transferReason: 'Car sold from Customer 1 to Customer 2 with NOC'
        })
      });
      assert.strictEqual(transferRes.status, 200);

      const audit = await AuditLog.findOne({
        entityType: 'Vehicle',
        entityId: testVehicleId,
        action: 'VEHICLE_OWNERSHIP_TRANSFERRED'
      });
      assert.ok(audit, 'Audit log must record explicit vehicle transfer');
    });

    // ----------------------------------------------------
    // TEST 9: Service CRUD and Activation Toggle
    // ----------------------------------------------------
    let testServiceId = '';
    await test('9. Service management: create, update, toggle active', async () => {
      // 1. Create service
      const createRes = await fetch(`${BASE_URL}/api/v1/admin/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          title: 'Japanese Decarbonization Service',
          shortDesc: 'Complete hydrogen engine decarbonization',
          priceDisplay: '₹1,999',
          basePrice: 1999,
          category: 'Specialty',
          isActive: true
        })
      });
      assert.strictEqual(createRes.status, 201);
      const createJson = await createRes.json();
      testServiceId = createJson.data._id;
      assert.strictEqual(createJson.data.title, 'Japanese Decarbonization Service');

      // 2. Toggle status
      const toggleRes = await fetch(`${BASE_URL}/api/v1/admin/services/${testServiceId}/toggle`, {
        method: 'PATCH',
        headers: {
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        }
      });
      assert.strictEqual(toggleRes.status, 200);
      const toggleJson = await toggleRes.json();
      assert.strictEqual(toggleJson.data.isActive, false, 'Service should now be deactivated');

      // 3. Update service
      const updateRes = await fetch(`${BASE_URL}/api/v1/admin/services/${testServiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          priceDisplay: '₹2,199',
          isActive: true
        })
      });
      assert.strictEqual(updateRes.status, 200);
      const updateJson = await updateRes.json();
      assert.strictEqual(updateJson.data.priceDisplay, '₹2,199');
      assert.strictEqual(updateJson.data.isActive, true);
    });

    // ----------------------------------------------------
    // TEST 10: Gallery Management CRUD
    // ----------------------------------------------------
    let testGalleryId = '';
    await test('10. Gallery management: create, update, delete', async () => {
      // 1. Create gallery item
      const createRes = await fetch(`${BASE_URL}/api/v1/admin/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          title: '3D Wheel Alignment Machine In Action',
          category: 'Machinery',
          image: '/assets/gallery/alignment.jpg',
          description: 'High precision 3D camera alignment'
        })
      });
      assert.strictEqual(createRes.status, 201);
      const createJson = await createRes.json();
      testGalleryId = createJson.data._id;

      // 2. Update gallery item
      const updateRes = await fetch(`${BASE_URL}/api/v1/admin/gallery/${testGalleryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        },
        body: JSON.stringify({
          badge: 'Latest Equipment'
        })
      });
      assert.strictEqual(updateRes.status, 200);
      const updateJson = await updateRes.json();
      assert.strictEqual(updateJson.data.badge, 'Latest Equipment');

      // 3. Delete gallery item
      const delRes = await fetch(`${BASE_URL}/api/v1/admin/gallery/${testGalleryId}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        }
      });
      assert.strictEqual(delRes.status, 200);
    });

    // ----------------------------------------------------
    // TEST 11: Review Management CRUD
    // ----------------------------------------------------
    let testReviewId = '';
    await test('11. Review management: create, toggle, delete', async () => {
      // 1. Create review
      const createRes = await fetch(`${BASE_URL}/api/v1/admin/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerName: 'Anil Hooda',
          carModel: 'Tata Safari',
          rating: 5,
          comment: 'Best mechanical workshop in Gohana!',
          verified: true
        })
      });
      assert.strictEqual(createRes.status, 201);
      const createJson = await createRes.json();
      testReviewId = createJson.data._id;

      // 2. Toggle active
      const toggleRes = await fetch(`${BASE_URL}/api/v1/admin/reviews/${testReviewId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        },
        body: JSON.stringify({ field: 'isActive' })
      });
      assert.strictEqual(toggleRes.status, 200);
      const toggleJson = await toggleRes.json();
      assert.strictEqual(toggleJson.data.isActive, false);

      // 3. Delete review
      const delRes = await fetch(`${BASE_URL}/api/v1/admin/reviews/${testReviewId}`, {
        method: 'DELETE',
        headers: {
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        }
      });
      assert.strictEqual(delRes.status, 200);
    });

    // ----------------------------------------------------
    // TEST 12: Business Settings GET & PUT
    // ----------------------------------------------------
    await test('12. Business settings retrieval and update with audit log', async () => {
      const getRes = await fetch(`${BASE_URL}/api/v1/admin/settings`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(getRes.status, 200);
      const getJson = await getRes.json();
      assert.strictEqual(getJson.success, true);
      assert.ok(getJson.data.business.name);

      const putRes = await fetch(`${BASE_URL}/api/v1/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          business: {
            tagline: 'Expert Car Care Under One Roof in Gohana'
          }
        })
      });
      assert.strictEqual(putRes.status, 200);
      const putJson = await putRes.json();
      assert.strictEqual(putJson.data.business.tagline, 'Expert Car Care Under One Roof in Gohana');

      const audit = await AuditLog.findOne({
        entityType: 'BusinessSetting',
        action: 'SETTINGS_UPDATED'
      });
      assert.ok(audit, 'Audit log must record settings update');
    });

    // ----------------------------------------------------
    // TEST 13: Audit Logs Access Control (OWNER vs SUPER_ADMIN)
    // ----------------------------------------------------
    await test('13. Audit logs listing: OWNER permitted, SUPER_ADMIN blocked (403)', async () => {
      // 1. OWNER can access audit logs
      const ownerRes = await fetch(`${BASE_URL}/api/v1/admin/audit-logs`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(ownerRes.status, 200, 'OWNER must be able to view audit logs');
      const ownerJson = await ownerRes.json();
      assert.strictEqual(ownerJson.success, true);
      assert.ok(Array.isArray(ownerJson.data));
      assert.ok(ownerJson.data.length >= 1);

      // 2. SUPER_ADMIN receives 403 Forbidden
      const superRes = await fetch(`${BASE_URL}/api/v1/admin/audit-logs`, {
        headers: { Cookie: cookieHeader(superAdminAuth.cookies) }
      });
      assert.strictEqual(superRes.status, 403, 'SUPER_ADMIN must receive 403 on audit logs');
      const superJson = await superRes.json();
      assert.strictEqual(superJson.success, false);
      assert.strictEqual(superJson.error.code, 'FORBIDDEN');
    });

    // ----------------------------------------------------
    // TEST 14: Dedicated Vehicle Transfer Endpoint (POST /transfer-owner)
    // ----------------------------------------------------
    await test('14. Dedicated vehicle transfer endpoint (POST /vehicles/:id/transfer-owner)', async () => {
      // Create destination customer
      const targetCustomer = await Customer.create({
        fullName: 'Phase 4 Transfer Recipient',
        mobileNumber: '9873334455',
        city: 'Gohana'
      });

      // Attempt transfer without confirm flag -> 400
      const unconfirmedRes = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${testVehicleId}/transfer-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerId: targetCustomer._id.toString()
        })
      });
      assert.strictEqual(unconfirmedRes.status, 400);

      // Perform valid transfer
      const validTransferRes = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${testVehicleId}/transfer-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerId: targetCustomer._id.toString(),
          confirmOwnershipTransfer: true,
          transferReason: 'Family ownership change with verified documents'
        })
      });
      assert.strictEqual(validTransferRes.status, 200);
      const json = await validTransferRes.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.customerId, targetCustomer._id.toString());

      // Attempt to transfer to the same owner -> 400
      const sameOwnerRes = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${testVehicleId}/transfer-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerId: targetCustomer._id.toString(),
          confirmOwnershipTransfer: true,
          transferReason: 'Redundant transfer attempt'
        })
      });
      assert.strictEqual(sameOwnerRes.status, 400);
      const sameOwnerJson = await sameOwnerRes.json();
      assert.strictEqual(sameOwnerJson.error.code, 'SAME_OWNER');
    });

    // ----------------------------------------------------
    // TEST 15: Search Query Regex Escaping (ReDoS Prevention)
    // ----------------------------------------------------
    await test('15. Search input regex escaping handles special characters safely', async () => {
      // Query with unbalanced brackets and metacharacters: ([*+?^$
      const dangerousQuery = encodeURIComponent('([*+?^$');
      const res = await fetch(`${BASE_URL}/api/v1/admin/customers?search=${dangerousQuery}`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200, 'Regex metacharacters must not cause 500 or crash');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
    });

    // ----------------------------------------------------
    // TEST 16: Media URL Validation Rejects Unsafe Schemes
    // ----------------------------------------------------
    await test('16. Media URL validation rejects dangerous schemes (javascript:, data:)', async () => {
      const maliciousRes = await fetch(`${BASE_URL}/api/v1/admin/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          title: 'Malicious Payload',
          category: 'Diagnostics',
          image: 'javascript:alert(1)' // Dangerous scheme
        })
      });
      assert.strictEqual(maliciousRes.status, 400, 'Dangerous media URLs must return 400');
      const json = await maliciousRes.json();
      assert.strictEqual(json.error.code, 'INVALID_MEDIA_URL');
    });

    // ----------------------------------------------------
    // TEST 17: User Management Route Aliases (/api/v1/admin/users & /api/v1/users)
    // ----------------------------------------------------
    await test('17. User management route alias (/api/v1/users) mirrors /api/v1/admin/users', async () => {
      // 1. OWNER can access /api/v1/users
      const ownerRes = await fetch(`${BASE_URL}/api/v1/users`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(ownerRes.status, 200);
      const ownerJson = await ownerRes.json();
      assert.strictEqual(ownerJson.success, true);

      // 2. SUPER_ADMIN receives 403 on /api/v1/users
      const superRes = await fetch(`${BASE_URL}/api/v1/users`, {
        headers: { Cookie: cookieHeader(superAdminAuth.cookies) }
      });
      assert.strictEqual(superRes.status, 403);
      const superJson = await superRes.json();
      assert.strictEqual(superJson.error.code, 'FORBIDDEN');
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} PHASE 4 TESTS PASSED SUCCESSFULLY! `);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
  }
}

runPhase4Tests().catch((err) => {
  console.error('\nPhase 4 Test Suite Failed:\n', err);
  process.exit(1);
});
