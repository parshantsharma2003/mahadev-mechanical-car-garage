import assert from 'assert';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import {
  User,
  Customer,
  Vehicle,
  Appointment,
  JobCard,
  AuditLog
} from '../src/models/index.js';

dotenv.config();

const TEST_PORT = 5070;
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

async function runPhase5Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 5 TEST SUITE            ');
  console.log('   JOB CARDS & WORKSHOP OPERATIONS FOUNDATION         ');
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

    await User.deleteMany({ email: { $in: ['p5owner@test.com', 'p5super@test.com'] } });

    const ownerUser = await User.create({
      fullName: 'Phase 5 Owner',
      email: 'p5owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      phone: '9866666666',
      isActive: true,
      tokenVersion: 0
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 5 Super Admin',
      email: 'p5super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      phone: '9877777777',
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

    // Clean up test fixtures from previous test runs
    await Customer.deleteMany({ mobileNumber: { $in: ['9881112233', '9882223344', '9883334455', '9884445566'] } });
    await Vehicle.deleteMany({ registrationNumberClean: { $in: ['HR11P501', 'HR11P502', 'HR11P503'] } });
    await JobCard.deleteMany({ jobCardNumber: /^JC-/ });
    await Appointment.deleteMany({ bookingReference: /^BK-P5-/ });

    const ownerAuth = await loginUser('p5owner@test.com');
    const superAdminAuth = await loginUser('p5super@test.com');

    // Seed test customer & vehicle
    const customerA = await Customer.create({
      fullName: 'Vikram Singh',
      mobileNumber: '9881112233',
      email: 'vikram@example.com',
      city: 'Gohana',
      address: 'Main Market Road'
    });

    const vehicleA = await Vehicle.create({
      customerId: customerA._id,
      brand: 'Mahindra',
      model: 'Scorpio-N',
      registrationNumberClean: 'HR11P501',
      registrationNumberDisplay: 'HR 11 P 501',
      fuelType: 'DIESEL',
      manufacturingYear: 2023,
      color: 'Deep Forest Green'
    });

    // Customer B and Vehicle B for mismatch ownership testing
    const customerB = await Customer.create({
      fullName: 'Rohit Hooda',
      mobileNumber: '9882223344',
      email: 'rohit@example.com',
      city: 'Rohtak',
      address: 'Sector 14'
    });

    const vehicleB = await Vehicle.create({
      customerId: customerB._id,
      brand: 'Toyota',
      model: 'Innova Crysta',
      registrationNumberClean: 'HR11P502',
      registrationNumberDisplay: 'HR 11 P 502',
      fuelType: 'DIESEL',
      manufacturingYear: 2022
    });

    // ----------------------------------------------------
    // TEST 1: Unauthenticated request rejected (401)
    // ----------------------------------------------------
    await test('1. Unauthenticated request rejected on Job Card endpoints (401)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/job-cards`);
      assert.strictEqual(res.status, 401);

      const resPost = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customerA._id, vehicleId: vehicleA._id })
      });
      assert.strictEqual(resPost.status, 401);
    });

    // ----------------------------------------------------
    // TEST 2: CSRF protection on mutation routes (403)
    // ----------------------------------------------------
    await test('2. Mutation routes without valid CSRF rejected (403)', async () => {
      // POST without CSRF token
      const resNoCsrf = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies)
        },
        body: JSON.stringify({ customerId: customerA._id, vehicleId: vehicleA._id })
      });
      assert.strictEqual(resNoCsrf.status, 403);

      // POST with invalid CSRF token
      const resBadCsrf = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': 'bogus-csrf-token-12345'
        },
        body: JSON.stringify({ customerId: customerA._id, vehicleId: vehicleA._id })
      });
      assert.strictEqual(resBadCsrf.status, 403);
    });

    // ----------------------------------------------------
    // TEST 3: Direct Walk-in Job Card creation (201 Created)
    // ----------------------------------------------------
    let createdJobCardId = '';
    let createdJobCardNum = '';

    await test('3. OWNER can create direct walk-in Job Card with full intake inspection (201 Created)', async () => {
      const payload = {
        customerId: customerA._id.toString(),
        vehicleId: vehicleA._id.toString(),
        odometerReading: 34500,
        fuelLevel: 'HALF',
        vehicleCondition: {
          exteriorNotes: 'Minor scratch on left rear bumper',
          hasSpareWheel: true,
          hasJack: true,
          hasToolKit: true,
          scratches: ['Left rear bumper']
        },
        inspectionNotes: 'Front brake pads 40% life remaining, oil change recommended',
        estimatedDeliveryAt: new Date(Date.now() + 86400000).toISOString(),
        customerComplaint: 'Engine noise at idle and AC cooling slow',
        internalNotes: 'Allocated to Bay 2 senior technician',
        requestedServices: [
          { name: 'Comprehensive Periodic Service', category: 'Maintenance', price: 3500 },
          { name: 'AC Gas Refill & Filter Cleaning', category: 'Climate Control', price: 1800 }
        ]
      };

      const res = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify(payload)
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data._id);
      assert.ok(json.data.jobCardNumber.startsWith('JC-'));
      assert.strictEqual(json.data.status, 'CREATED');
      assert.strictEqual(json.data.odometerReading, 34500);
      assert.strictEqual(json.data.fuelLevel, 'HALF');
      assert.strictEqual(json.data.customerSnapshot.fullName, 'Vikram Singh');
      assert.strictEqual(json.data.customerSnapshot.mobileNumber, '9881112233');
      assert.strictEqual(json.data.vehicleSnapshot.brand, 'Mahindra');
      assert.strictEqual(json.data.vehicleSnapshot.model, 'Scorpio-N');
      assert.strictEqual(json.data.vehicleSnapshot.registrationNumber, 'HR 11 P 501');
      assert.strictEqual(json.data.requestedServices.length, 2);

      createdJobCardId = json.data._id;
      createdJobCardNum = json.data.jobCardNumber;
    });

    // ----------------------------------------------------
    // TEST 4: SUPER_ADMIN has access to Job Card operations
    // ----------------------------------------------------
    await test('4. SUPER_ADMIN can view and list Job Cards (200 OK)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        headers: { Cookie: cookieHeader(superAdminAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.length >= 1);
      const found = json.data.find((c) => c._id === createdJobCardId);
      assert.ok(found);

      // Fetch by ID
      const resGet = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}`, {
        headers: { Cookie: cookieHeader(superAdminAuth.cookies) }
      });
      assert.strictEqual(resGet.status, 200);
      const jsonGet = await resGet.json();
      assert.strictEqual(jsonGet.success, true);
      assert.strictEqual(jsonGet.data.jobCardNumber, createdJobCardNum);
    });

    // ----------------------------------------------------
    // TEST 5: Vehicle ownership mismatch validation (Never silently transfer)
    // ----------------------------------------------------
    await test('5. Rejection when vehicle does not belong to specified customer (400 VEHICLE_OWNER_MISMATCH)', async () => {
      // Vehicle B belongs to Customer B, trying to assign to Customer A without transfer
      const res = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          customerId: customerA._id.toString(),
          vehicleId: vehicleB._id.toString(),
          customerComplaint: 'Testing mismatch'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'VEHICLE_OWNER_MISMATCH');
    });

    // ----------------------------------------------------
    // TEST 6: Rejection of unconfirmed appointment conversion
    // ----------------------------------------------------
    let pendingAppointment = null;
    await test('6. Rejection of unconfirmed appointment conversion (400 APPOINTMENT_NOT_CONFIRMED)', async () => {
      pendingAppointment = await Appointment.create({
        bookingReference: 'BK-P5-0001',
        idempotencyKey: 'idemp-p5-0001',
        customerId: customerA._id,
        vehicleId: vehicleA._id,
        customerSnapshot: { fullName: 'Vikram Singh', mobileNumber: '9881112233' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N', registrationNumber: 'HR 11 P 501' },
        services: [{ title: 'Wheel Alignment', priceDisplay: '₹600' }],
        preferredDate: new Date(Date.now() + 86400000),
        preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
        problemDescription: 'Steering pulling left',
        status: 'PENDING'
      });

      const res = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          appointmentId: pendingAppointment._id.toString(),
          odometerReading: 35000
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'APPOINTMENT_NOT_CONFIRMED');
    });

    // ----------------------------------------------------
    // TEST 7: Conversion of CONFIRMED appointment into Job Card
    // ----------------------------------------------------
    let confirmedApptJobCard = null;
    await test('7. Successful conversion of CONFIRMED appointment into Job Card (201 Created)', async () => {
      // Advance pending appointment to CONFIRMED
      pendingAppointment.status = 'CONFIRMED';
      pendingAppointment.statusTimeline.push({
        status: 'CONFIRMED',
        changedBy: ownerUser._id,
        role: 'OWNER',
        reason: 'Confirmed by workshop manager'
      });
      await pendingAppointment.save();

      const res = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          appointmentId: pendingAppointment._id.toString(),
          odometerReading: 35200,
          fuelLevel: 'THREE_QUARTERS',
          inspectionNotes: 'Customer arrived on time, initial check complete'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.jobCardNumber);
      assert.strictEqual(json.data.appointmentId, pendingAppointment._id.toString());
      assert.strictEqual(json.data.status, 'CREATED');
      assert.strictEqual(json.data.customerComplaint, 'Steering pulling left');
      assert.strictEqual(json.data.requestedServices[0].name, 'Wheel Alignment');

      confirmedApptJobCard = json.data;

      // Verify original appointment status was updated to IN_PROGRESS
      const updatedAppt = await Appointment.findById(pendingAppointment._id);
      assert.strictEqual(updatedAppt.status, 'IN_PROGRESS');
      const lastTimeline = updatedAppt.statusTimeline[updatedAppt.statusTimeline.length - 1];
      assert.strictEqual(lastTimeline.status, 'IN_PROGRESS');
      assert.ok(lastTimeline.reason.includes('Converted to Job Card'));
    });

    // ----------------------------------------------------
    // TEST 8: Prevention of duplicate Job Cards for the same appointment
    // ----------------------------------------------------
    await test('8. Duplicate appointment conversion is rejected (409 DUPLICATE_JOB_CARD)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          appointmentId: pendingAppointment._id.toString()
        })
      });

      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'DUPLICATE_JOB_CARD');
    });

    // ----------------------------------------------------
    // TEST 9: Lookup Job Card by Appointment ID
    // ----------------------------------------------------
    await test('9. GET /appointments/:id/job-card retrieves linked Job Card', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/appointments/${pendingAppointment._id}/job-card`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data._id, confirmedApptJobCard._id);
      assert.strictEqual(json.data.jobCardNumber, confirmedApptJobCard.jobCardNumber);

      // Non-existent appointment job card returns 404
      const bogusId = new mongoose.Types.ObjectId();
      const res404 = await fetch(`${BASE_URL}/api/v1/appointments/${bogusId}/job-card`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res404.status, 404);
      const json404 = await res404.json();
      assert.strictEqual(json404.error.code, 'JOB_CARD_NOT_FOUND');
    });

    // ----------------------------------------------------
    // TEST 10: Strict finite-state transition validator rejects invalid transitions (400)
    // ----------------------------------------------------
    await test('10. Invalid status transition rejected with HTTP 400', async () => {
      // Trying CREATED -> COMPLETED (invalid leap)
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'INVALID_STATUS_TRANSITION');

      // Invalid status value
      const resInvalid = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'NON_EXISTENT_STATUS' })
      });
      assert.strictEqual(resInvalid.status, 400);
      const jsonInv = await resInvalid.json();
      assert.strictEqual(jsonInv.error.code, 'INVALID_STATUS');
    });

    // ----------------------------------------------------
    // TEST 11: Valid finite-state transitions and milestone timestamps
    // ----------------------------------------------------
    await test('11. Valid finite-state transitions through full workshop lifecycle', async () => {
      // 1. CREATED -> INSPECTION
      let res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'INSPECTION', notes: 'Vehicle on hydraulic ramp for underbody check' })
      });
      assert.strictEqual(res.status, 200);
      let json = await res.json();
      assert.strictEqual(json.data.status, 'INSPECTION');

      // 2. INSPECTION -> WAITING_FOR_APPROVAL
      res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'WAITING_FOR_APPROVAL', notes: 'Estimate sent to customer on WhatsApp' })
      });
      assert.strictEqual(res.status, 200);
      json = await res.json();
      assert.strictEqual(json.data.status, 'WAITING_FOR_APPROVAL');

      // 3. WAITING_FOR_APPROVAL -> IN_PROGRESS (startedAt milestone recorded)
      res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'IN_PROGRESS', notes: 'Customer approved estimate, service underway' })
      });
      assert.strictEqual(res.status, 200);
      json = await res.json();
      assert.strictEqual(json.data.status, 'IN_PROGRESS');
      assert.ok(json.data.startedAt);

      // 4. IN_PROGRESS -> QUALITY_CHECK
      res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'QUALITY_CHECK', notes: 'All mechanical items completed, QC road test' })
      });
      assert.strictEqual(res.status, 200);
      json = await res.json();
      assert.strictEqual(json.data.status, 'QUALITY_CHECK');

      // 5. QUALITY_CHECK -> COMPLETED (completedAt milestone recorded)
      res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'COMPLETED', notes: 'QC passed, car washed and parked in delivery bay' })
      });
      assert.strictEqual(res.status, 200);
      json = await res.json();
      assert.strictEqual(json.data.status, 'COMPLETED');
      assert.ok(json.data.completedAt);

      // 6. COMPLETED -> DELIVERED (deliveredAt milestone recorded)
      res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'DELIVERED', notes: 'Customer picked up vehicle' })
      });
      assert.strictEqual(res.status, 200);
      json = await res.json();
      assert.strictEqual(json.data.status, 'DELIVERED');
      assert.ok(json.data.deliveredAt);

      // 7. Verify terminal state cannot be transitioned further
      res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });
      assert.strictEqual(res.status, 400);
    });

    // ----------------------------------------------------
    // TEST 12: Historical snapshot preservation
    // ----------------------------------------------------
    await test('12. Historical snapshot preservation after customer/vehicle modification', async () => {
      // Update customer A's name and vehicle A's plate in main registries
      customerA.fullName = 'Vikram Singh Modified Name';
      customerA.mobileNumber = '9884445566';
      await customerA.save();

      vehicleA.brand = 'Modified Brand';
      vehicleA.registrationNumberDisplay = 'HR 99 ZZ 9999';
      await vehicleA.save();

      // Fetch the previously created Job Card
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();

      // Original snapshots MUST be intact!
      assert.strictEqual(json.data.customerSnapshot.fullName, 'Vikram Singh');
      assert.strictEqual(json.data.customerSnapshot.mobileNumber, '9881112233');
      assert.strictEqual(json.data.vehicleSnapshot.brand, 'Mahindra');
      assert.strictEqual(json.data.vehicleSnapshot.model, 'Scorpio-N');
      assert.strictEqual(json.data.vehicleSnapshot.registrationNumber, 'HR 11 P 501');
    });

    // ----------------------------------------------------
    // TEST 13: AuditLog creation for Job Card lifecycle events
    // ----------------------------------------------------
    await test('13. AuditLog entries generated for Job Card creation and status updates', async () => {
      const logs = await AuditLog.find({
        entityType: 'JobCard',
        entityId: createdJobCardId
      });

      assert.ok(logs.length >= 2, `Expected at least 2 audit logs, found ${logs.length}`);
      const actions = logs.map((l) => l.action);
      assert.ok(actions.includes('JOB_CARD_CREATED'));
      assert.ok(actions.includes('JOB_CARD_STATUS_UPDATED'));

      // Verify immutable audit log properties
      const createLog = logs.find((l) => l.action === 'JOB_CARD_CREATED');
      assert.strictEqual(createLog.actorRole, 'OWNER');
      assert.strictEqual(createLog.diff.after.status, 'CREATED');
    });

    // ----------------------------------------------------
    // TEST 14: Pagination limit cap at 100
    // ----------------------------------------------------
    await test('14. Pagination limit is strictly capped at maximum 100', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/job-cards?limit=500`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.pagination.limit, 100);
    });

    // ----------------------------------------------------
    // TEST 15: Search functionality across multiple fields
    // ----------------------------------------------------
    await test('15. Search filters correctly by jobCardNumber, customer, and vehicle plate', async () => {
      // Search by jobCardNumber
      const resNum = await fetch(`${BASE_URL}/api/v1/job-cards?search=${createdJobCardNum}`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(resNum.status, 200);
      const jsonNum = await resNum.json();
      assert.strictEqual(jsonNum.data.length, 1);
      assert.strictEqual(jsonNum.data[0]._id, createdJobCardId);

      // Search by customer mobile
      const resMobile = await fetch(`${BASE_URL}/api/v1/job-cards?search=9881112233`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(resMobile.status, 200);
      const jsonMobile = await resMobile.json();
      assert.ok(jsonMobile.data.length >= 1);

      // Search by vehicle plate
      const resPlate = await fetch(`${BASE_URL}/api/v1/job-cards?search=HR 11 P 501`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(resPlate.status, 200);
      const jsonPlate = await resPlate.json();
      assert.ok(jsonPlate.data.length >= 1);
    });

    // ----------------------------------------------------
    // TEST 16: Update Job Card details (PATCH /job-cards/:id)
    // ----------------------------------------------------
    await test('16. PATCH /job-cards/:id updates inspection details and records AuditLog', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${confirmedApptJobCard._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          odometerReading: 36000,
          fuelLevel: 'FULL',
          inspectionNotes: 'Updated post-alignment test notes',
          internalNotes: 'Mechanic notes updated for bay review'
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.odometerReading, 36000);
      assert.strictEqual(json.data.fuelLevel, 'FULL');
      assert.strictEqual(json.data.inspectionNotes, 'Updated post-alignment test notes');
      assert.strictEqual(json.data.internalNotes, 'Mechanic notes updated for bay review');

      // Verify AuditLog for update
      const updateLog = await AuditLog.findOne({
        entityType: 'JobCard',
        entityId: confirmedApptJobCard._id,
        action: 'JOB_CARD_UPDATED'
      });
      assert.ok(updateLog);
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} PHASE 5 TESTS PASSED SUCCESSFULLY! `);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
  }
}

runPhase5Tests().catch((err) => {
  console.error('\nPhase 5 Test Suite execution failed:', err);
  process.exit(1);
});
