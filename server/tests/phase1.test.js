import assert from 'assert';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import {
  User,
  Customer,
  Vehicle,
  Appointment,
  IdempotencyRecord,
  Enquiry,
  Service,
  GalleryItem,
  Review,
  BusinessSetting,
  AuditLog
} from '../src/models/index.js';
import {
  normalizeIndianPhone,
  normalizeRegistrationNumber
} from '../src/utils/normalizers.js';
import { seedDatabase } from '../src/scripts/seed.js';

dotenv.config();

let serverInstance = null;
const TEST_PORT = 5055;

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 1 TEST SUITE            ');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const test = async (name, fn) => {
    totalTests++;
    try {
      process.stdout.write(`[Test ${totalTests}] ${name} ... `);
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
    // 1. Database Connection Test
    await test('1. MongoDB Connection & Database Ping', async () => {
      const conn = await connectDB();
      assert.strictEqual(mongoose.connection.readyState, 1, 'Mongoose should be connected (readyState 1)');
      const ping = await conn.connection.db.admin().ping();
      assert.ok(ping.ok === 1, 'MongoDB ping should return ok: 1');
    });

    // 2. Normalization Helpers Test
    await test('2. Normalization Helpers (Phone & Registration Plate)', async () => {
      // Phone normalization tests
      assert.strictEqual(normalizeIndianPhone('8295669463'), '8295669463');
      assert.strictEqual(normalizeIndianPhone('+91 82956-69463'), '8295669463');
      assert.strictEqual(normalizeIndianPhone('08295669463'), '8295669463');
      assert.strictEqual(normalizeIndianPhone('918295669463'), '8295669463');
      assert.throws(() => normalizeIndianPhone('12345'), /Invalid mobile number/);
      assert.throws(() => normalizeIndianPhone('5295669463'), /Invalid mobile number/); // Starts with 5

      // Vehicle plate normalization tests
      const plate1 = normalizeRegistrationNumber('hr 11 aa 1234');
      assert.strictEqual(plate1.clean, 'HR11AA1234');
      assert.strictEqual(plate1.display, 'HR 11 AA 1234');

      const plate2 = normalizeRegistrationNumber('');
      assert.strictEqual(plate2.clean, null);
      assert.strictEqual(plate2.display, null);
    });

    // 3. User Model & Role Integrity Test
    await test('3. User Model (OWNER/SUPER_ADMIN, Hash Hiding, Role Validation)', async () => {
      // Ensure test user is cleaned up
      await User.deleteMany({ email: /test.*@example\.com/ });

      // Valid OWNER creation
      const user = await User.create({
        fullName: 'Test Owner',
        email: 'testowner@example.com',
        passwordHash: '$2a$12$e80yq9gQ9jU2V0l.s2s3.OqJd.9G5k5N1.s3m1r2k4s5t6u7v8w9x',
        role: 'OWNER'
      });
      assert.strictEqual(user.role, 'OWNER');
      assert.strictEqual(user.isActive, true);
      assert.strictEqual(user.tokenVersion, 0);

      // Verify passwordHash is hidden by default in find queries
      const fetched = await User.findById(user._id);
      assert.strictEqual(fetched.passwordHash, undefined, 'passwordHash must be select: false');

      // Verify invalid role throws validation error
      let errorThrown = false;
      try {
        await User.create({
          fullName: 'Mechanic User',
          email: 'testmechanic@example.com',
          passwordHash: 'dummyhash',
          role: 'MECHANIC' // Not in enum ['OWNER', 'SUPER_ADMIN']
        });
      } catch (err) {
        errorThrown = true;
        assert.ok(err.errors?.role, 'Should reject non-OWNER/SUPER_ADMIN role');
      }
      assert.ok(errorThrown, 'Should fail when creating user with role MECHANIC');
    });

    // 4. Customer Model & Unique Mobile Index Test
    await test('4. Customer Model & Unique Mobile Index', async () => {
      await Customer.deleteMany({ mobileNumber: '9999900001' });

      const customer1 = await Customer.create({
        fullName: 'Aman Deep',
        mobileNumber: '9999900001'
      });
      assert.strictEqual(customer1.totalBookingsCount, 1);

      // Attempt duplicate mobile number
      let dupError = false;
      try {
        await Customer.create({
          fullName: 'Duplicate Aman',
          mobileNumber: '9999900001'
        });
      } catch (err) {
        dupError = true;
        assert.strictEqual(err.code, 11000, 'Duplicate key error code must be 11000');
      }
      assert.ok(dupError, 'Must reject duplicate customer mobile number');
    });

    // 5. Vehicle Model & Globally Unique Partial Plate Index Test
    await test('5. Vehicle Model & Globally Unique Partial Index', async () => {
      // Clean up previous test vehicles
      await Vehicle.deleteMany({
        $or: [{ registrationNumberClean: 'HR11TEST99' }, { notes: 'phase1-test-unplated' }]
      });

      const customer = await Customer.findOne();
      assert.ok(customer, 'Customer required for vehicle linkage');

      // Vehicle 1 with registration plate
      const v1 = await Vehicle.create({
        customerId: customer._id,
        brand: 'Mahindra',
        model: 'Scorpio-N',
        registrationNumberClean: 'HR11TEST99',
        registrationNumberDisplay: 'HR 11 TEST 99'
      });
      assert.ok(v1._id);

      // Attempt duplicate registration plate
      let dupPlateError = false;
      try {
        await Vehicle.create({
          customerId: customer._id,
          brand: 'Hyundai',
          model: 'Creta',
          registrationNumberClean: 'HR11TEST99'
        });
      } catch (err) {
        dupPlateError = true;
        assert.strictEqual(err.code, 11000, 'Must throw E11000 duplicate key error on plate collision');
      }
      assert.ok(dupPlateError, 'Must enforce global uniqueness on non-empty registration plates');

      // Unplated vehicles (null plate) should NOT collide
      const unplated1 = await Vehicle.create({
        customerId: customer._id,
        brand: 'Maruti',
        model: 'Swift',
        registrationNumberClean: null,
        notes: 'phase1-test-unplated'
      });
      const unplated2 = await Vehicle.create({
        customerId: customer._id,
        brand: 'Tata',
        model: 'Nexon',
        registrationNumberClean: null,
        notes: 'phase1-test-unplated'
      });
      assert.ok(unplated1._id && unplated2._id, 'Multiple unplated vehicles must be permitted without collision');
    });

    // 6. IdempotencyRecord Model & 48-Hour TTL Index Test
    await test('6. IdempotencyRecord Model & 48-Hour TTL Index Verification', async () => {
      await IdempotencyRecord.createIndexes();
      const indexes = await IdempotencyRecord.collection.indexes();
      
      const ttlIndex = indexes.find((idx) => idx.name === 'createdAt_1' || idx.key?.createdAt === 1);
      assert.ok(ttlIndex, 'TTL index on createdAt must exist');
      assert.strictEqual(
        ttlIndex.expireAfterSeconds,
        172800,
        'TTL expireAfterSeconds must be exactly 172800 (48 hours)'
      );

      const testKey = 'test-uuid-' + Date.now();
      const rec = await IdempotencyRecord.create({
        key: testKey,
        endpoint: '/api/v1/public/bookings',
        statusCode: 201,
        responseBody: { success: true, bookingReference: 'MHG-TEST-0001' }
      });
      assert.strictEqual(rec.key, testKey);
    });

    // 7. AuditLog Immutability Test (All Mutation Paths & Dedicated Service)
    await test('7. AuditLog Immutability (All Mutation Paths & Service Test)', async () => {
      const { createAuditRecord } = await import('../src/services/auditService.js');
      const user = await User.findOne();

      // Test creation via dedicated service
      const audit = await createAuditRecord({
        actorId: user._id,
        actorRole: 'OWNER',
        actorName: 'Test Owner',
        action: 'TEST_ACTION',
        entityType: 'System',
        entityId: 'sys-01',
        diff: { before: null, after: { status: 'tested' } },
        ipAddress: '127.0.0.1',
        userAgent: 'Phase1TestAgent'
      });
      assert.ok(audit._id, 'Audit log created via dedicated audit service');

      // 1. updateOne must be blocked
      await assert.rejects(
        () => AuditLog.updateOne({ _id: audit._id }, { action: 'MUTATED' }),
        /AUDIT_LOG_IMMUTABLE/,
        'updateOne must be blocked'
      );

      // 2. updateMany must be blocked
      await assert.rejects(
        () => AuditLog.updateMany({ entityId: 'sys-01' }, { action: 'MUTATED' }),
        /AUDIT_LOG_IMMUTABLE/,
        'updateMany must be blocked'
      );

      // 3. findOneAndUpdate must be blocked
      await assert.rejects(
        () => AuditLog.findOneAndUpdate({ _id: audit._id }, { action: 'MUTATED' }),
        /AUDIT_LOG_IMMUTABLE/,
        'findOneAndUpdate must be blocked'
      );

      // 4. replaceOne must be blocked
      await assert.rejects(
        () => AuditLog.replaceOne({ _id: audit._id }, { action: 'REPLACED' }),
        /AUDIT_LOG_IMMUTABLE/,
        'replaceOne must be blocked'
      );

      // 5. findOneAndReplace must be blocked
      await assert.rejects(
        () => AuditLog.findOneAndReplace({ _id: audit._id }, { action: 'REPLACED' }),
        /AUDIT_LOG_IMMUTABLE/,
        'findOneAndReplace must be blocked'
      );

      // 6. deleteOne (query-level) must be blocked
      await assert.rejects(
        () => AuditLog.deleteOne({ _id: audit._id }),
        /AUDIT_LOG_IMMUTABLE/,
        'query deleteOne must be blocked'
      );

      // 7. deleteMany (query-level) must be blocked
      await assert.rejects(
        () => AuditLog.deleteMany({ entityId: 'sys-01' }),
        /AUDIT_LOG_IMMUTABLE/,
        'query deleteMany must be blocked'
      );

      // 8. findOneAndDelete must be blocked
      await assert.rejects(
        () => AuditLog.findOneAndDelete({ _id: audit._id }),
        /AUDIT_LOG_IMMUTABLE/,
        'findOneAndDelete must be blocked'
      );

      // 9. bulkWrite must be blocked
      await assert.rejects(
        () => AuditLog.bulkWrite([{ deleteOne: { filter: { _id: audit._id } } }]),
        /AUDIT_LOG_IMMUTABLE/,
        'bulkWrite must be blocked'
      );

      // 10. Document-level save (modification on existing record) must be blocked
      await assert.rejects(
        async () => {
          audit.action = 'DOCUMENT_MUTATION';
          await audit.save();
        },
        /AUDIT_LOG_IMMUTABLE/,
        'document.save() on existing record must be blocked'
      );

      // 11. Document-level deleteOne must be blocked
      await assert.rejects(
        () => audit.deleteOne(),
        /AUDIT_LOG_IMMUTABLE/,
        'document.deleteOne() must be blocked'
      );
    });

    // 8. Seeding Idempotency Test
    await test('8. Seeding Script Idempotency (Execute Twice)', async () => {
      // First execution
      const stats1 = await seedDatabase();
      assert.ok(stats1.services.created >= 0);

      const serviceCount1 = await Service.countDocuments();
      const galleryCount1 = await GalleryItem.countDocuments();
      const reviewCount1 = await Review.countDocuments();
      const ownerCount1 = await User.countDocuments({ role: 'OWNER' });

      assert.ok(serviceCount1 >= 8, 'At least 8 core services should exist');
      assert.ok(galleryCount1 >= 16, 'At least 16 gallery items should exist');
      assert.ok(reviewCount1 >= 4, 'At least 4 reviews should exist');
      assert.ok(ownerCount1 >= 1, 'At least 1 OWNER account should exist');

      // Second execution must not duplicate anything
      const stats2 = await seedDatabase();
      assert.strictEqual(stats2.owner, 'skipped', 'OWNER should be skipped on second seed');
      assert.strictEqual(stats2.services.created, 0, 'No duplicate services should be created');
      assert.strictEqual(stats2.gallery.created, 0, 'No duplicate gallery items should be created');
      assert.strictEqual(stats2.reviews.created, 0, 'No duplicate reviews should be created');

      const serviceCount2 = await Service.countDocuments();
      assert.strictEqual(serviceCount1, serviceCount2, 'Service count must remain identical');
    });

    // 9. Health Endpoint HTTP Test (Non-Leaking Public Status)
    await test('9. Health Endpoint (GET /api/v1/health Sanitized Status)', async () => {
      await new Promise((resolve) => {
        serverInstance = app.listen(TEST_PORT, resolve);
      });

      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/health`);
      assert.strictEqual(res.status, 200, 'Health endpoint should return HTTP 200');

      const json = await res.json();
      assert.strictEqual(json.success, true, 'Health check success flag must be true');
      assert.strictEqual(json.status, 'healthy');
      assert.strictEqual(json.service, 'mahadev-garage-backend');
      assert.strictEqual(json.database, 'connected');
      assert.strictEqual(json.version, '1.0.0');

      // Verify NO sensitive infrastructure details are exposed
      assert.strictEqual(json.host, undefined, 'Database host must not be exposed');
      assert.strictEqual(json.name, undefined, 'Database name must not be exposed');
      assert.strictEqual(json.readyState, undefined, 'Internal readyState must not be exposed');
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} PHASE 1 TESTS PASSED SUCCESSFULLY! `);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    // Clean up temporary test accounts
    try {
      await User.deleteMany({ email: /test.*@example\.com/ });
      await Customer.deleteMany({ mobileNumber: '9999900001' });
      await Vehicle.deleteMany({
        $or: [{ registrationNumberClean: 'HR11TEST99' }, { notes: 'phase1-test-unplated' }]
      });
      await IdempotencyRecord.deleteMany({ key: /test-uuid/ });
    } catch {
      // Ignore cleanup error
    }
    await disconnectDB();
  }
}

runTestSuite().catch((err) => {
  console.error('\n[Test Suite Aborted]:', err);
  process.exit(1);
});
