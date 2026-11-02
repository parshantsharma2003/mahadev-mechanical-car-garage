import assert from 'assert';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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
  IdempotencyRecord,
  AuditLog
} from '../src/models/index.js';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  generateCsrfToken
} from '../src/utils/security.js';

dotenv.config();

const TEST_PORT = 5067;
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

const publicHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  'x-test-bypass-rate-limit': 'true',
  ...extra
});

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 3 TEST SUITE            ');
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

    await User.deleteMany({ email: { $in: ['p3owner@test.com', 'p3super@test.com'] } });

    const ownerUser = await User.create({
      fullName: 'Phase 3 Owner',
      email: 'p3owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      phone: '9811111111',
      isActive: true,
      tokenVersion: 0
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 3 Super Admin',
      email: 'p3super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      phone: '9822222222',
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

    const ownerAuth = await loginUser('p3owner@test.com');
    const superAdminAuth = await loginUser('p3super@test.com');

    // Setup test services: 1 Active, 1 Inactive
    await Service.deleteMany({ slug: { $in: ['p3-active-service', 'p3-inactive-service'] } });

    const activeService = await Service.create({
      slug: 'p3-active-service',
      title: 'Phase 3 Active Service',
      shortDesc: 'Active test service for booking',
      fullDesc: 'Complete active description with highlights',
      priceDisplay: '₹1,500',
      basePrice: 1500,
      category: 'Periodic Service',
      isActive: true,
      isCoreService: true,
      sortOrder: 1
    });

    const inactiveService = await Service.create({
      slug: 'p3-inactive-service',
      title: 'Phase 3 Inactive Service',
      shortDesc: 'Inactive test service',
      fullDesc: 'Should be rejected',
      priceDisplay: '₹2,500',
      basePrice: 2500,
      category: 'Detailing',
      isActive: false,
      isCoreService: false,
      sortOrder: 2
    });

    // ----------------------------------------------------
    // TEST 1: Valid Public Appointment Submission
    // ----------------------------------------------------
    let validBookingRef = '';
    let validBookingId = '';
    const testPhone1 = '9876543210';
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    const uuid1 = crypto.randomUUID();

    await test('1. Valid appointment submission without customer registration', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': uuid1 }),
        body: JSON.stringify({
          name: 'Vikas Sharma',
          phone: testPhone1,
          brand: 'Mahindra',
          model: 'Scorpio-N',
          registrationNumber: 'HR 11 AB 1234',
          serviceIds: [activeService._id.toString()],
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
          problemDescription: 'Check engine oil and brake pads'
        })
      });

      assert.strictEqual(res.status, 201, 'Should return HTTP 201 Created');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.bookingReference, 'Should return unique bookingReference');
      assert.strictEqual(json.data.status, 'PENDING');
      assert.strictEqual(json.data.customer.fullName, 'Vikas Sharma');
      assert.strictEqual(json.data.customer.mobileNumber, '9876543210');
      assert.strictEqual(json.data.vehicle.brand, 'Mahindra');
      assert.strictEqual(json.data.vehicle.model, 'Scorpio-N');
      assert.strictEqual(json.data.vehicle.registrationNumber, 'HR 11 AB 1234');
      assert.strictEqual(json.data.registrationConflict, false);

      // Verify NO internal database IDs are leaked in public response
      assert.strictEqual(json.data.customerId, undefined, 'customerId must not be exposed');
      assert.strictEqual(json.data.vehicleId, undefined, 'vehicleId must not be exposed');
      assert.strictEqual(json.data._id, undefined, '_id must not be exposed');

      validBookingRef = json.data.bookingReference;

      const createdAppointment = await Appointment.findOne({ bookingReference: validBookingRef });
      assert.ok(createdAppointment);
      validBookingId = createdAppointment._id.toString();
    });

    // ----------------------------------------------------
    // TEST 2: Invalid Mobile Number Rejection
    // ----------------------------------------------------
    await test('2. Invalid mobile number rejection', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Ramesh Kumar',
          phone: '1234567890', // Invalid Indian mobile (starts with 1)
          brand: 'Hyundai',
          model: 'Creta',
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
        })
      });

      assert.strictEqual(res.status, 400, 'Should reject invalid phone with 400');
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'INVALID_PHONE_NUMBER');
    });

    // ----------------------------------------------------
    // TEST 3: Invalid Service ID Rejection
    // ----------------------------------------------------
    await test('3. Invalid service ID rejection', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Ramesh Kumar',
          phone: '9812345678',
          brand: 'Hyundai',
          model: 'Creta',
          serviceIds: ['not-a-valid-mongo-id'],
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'INVALID_SERVICE_ID');
    });

    // ----------------------------------------------------
    // TEST 4: Inactive Service Rejection
    // ----------------------------------------------------
    await test('4. Inactive service rejection', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Ramesh Kumar',
          phone: '9812345678',
          brand: 'Hyundai',
          model: 'Creta',
          serviceIds: [inactiveService._id.toString()],
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'INACTIVE_OR_INVALID_SERVICE');
    });

    // ----------------------------------------------------
    // TEST 5: Past Appointment Date Rejection
    // ----------------------------------------------------
    await test('5. Past appointment date rejection', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Ramesh Kumar',
          phone: '9812345678',
          brand: 'Hyundai',
          model: 'Creta',
          preferredDate: '2020-01-01', // Past date
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'PAST_DATE_NOT_ALLOWED');
    });

    // ----------------------------------------------------
    // TEST 6: Successful Customer Creation in Database
    // ----------------------------------------------------
    await test('6. Successful customer creation in database', async () => {
      const customer = await Customer.findOne({ mobileNumber: testPhone1 });
      assert.ok(customer, 'Customer record should be created');
      assert.strictEqual(customer.fullName, 'Vikas Sharma');
      assert.strictEqual(customer.totalBookingsCount, 1);
    });

    // ----------------------------------------------------
    // TEST 7: Existing Customer Linking & Total Bookings Increment
    // ----------------------------------------------------
    await test('7. Existing customer linking on subsequent booking', async () => {
      const uuid2 = crypto.randomUUID();
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': uuid2 }),
        body: JSON.stringify({
          name: 'Vikas Sharma (Updated Name)',
          phone: '+91 98765-43210', // Formatted same number
          brand: 'Mahindra',
          model: 'Scorpio-N',
          preferredDate: futureDate,
          preferredTimeSlot: 'Afternoon (12:00 PM - 03:00 PM)'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.customer.mobileNumber, '9876543210');

      // Verify no duplicate customer was created
      const customerCount = await Customer.countDocuments({ mobileNumber: '9876543210' });
      assert.strictEqual(customerCount, 1, 'Exactly one customer record must exist for this phone');

      const customer = await Customer.findOne({ mobileNumber: '9876543210' });
      assert.strictEqual(customer.totalBookingsCount, 2, 'totalBookingsCount must be incremented to 2');
    });

    // ----------------------------------------------------
    // TEST 8: Duplicate Customer Prevention Under Concurrent Requests
    // ----------------------------------------------------
    const concurrentPhone = '9777788888';
    await test('8. Duplicate customer prevention under concurrent requests', async () => {
      await Customer.deleteMany({ mobileNumber: concurrentPhone });

      const payload = {
        name: 'Concurrent User',
        phone: concurrentPhone,
        brand: 'Tata',
        model: 'Harrier',
        preferredDate: futureDate,
        preferredTimeSlot: 'Evening (03:00 PM - 07:00 PM)'
      };

      // Fire 5 concurrent requests with distinct idempotency keys
      const promises = Array.from({ length: 5 }).map(() =>
        fetch(`${BASE_URL}/api/v1/public/appointments`, {
          method: 'POST',
          headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
          body: JSON.stringify(payload)
        })
      );

      const results = await Promise.all(promises);
      for (const res of results) {
        assert.strictEqual(res.status, 201, 'Every concurrent booking should succeed');
      }

      // Verify only 1 customer was created in DB
      const customers = await Customer.find({ mobileNumber: concurrentPhone });
      assert.strictEqual(customers.length, 1, 'Only one customer record should exist despite concurrent requests');
      assert.strictEqual(customers[0].totalBookingsCount, 5, 'Customer totalBookingsCount should reflect all bookings');
    });

    // ----------------------------------------------------
    // TEST 9: Vehicle Matching for Same Customer
    // ----------------------------------------------------
    await test('9. Vehicle matching for the same customer', async () => {
      const initialVehicles = await Vehicle.countDocuments({ registrationNumberClean: 'HR11AB1234' });
      assert.strictEqual(initialVehicles, 1);

      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Vikas Sharma',
          phone: testPhone1,
          brand: 'Mahindra',
          model: 'Scorpio-N',
          registrationNumber: 'hr11ab1234', // Same plate, lowercase
          preferredDate: futureDate,
          preferredTimeSlot: 'Evening (03:00 PM - 07:00 PM)'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.registrationConflict, false);

      const vehicleCount = await Vehicle.countDocuments({ registrationNumberClean: 'HR11AB1234' });
      assert.strictEqual(vehicleCount, 1, 'Vehicle record should be reused without duplication');
    });

    // ----------------------------------------------------
    // TEST 10: Vehicle Conflict With Another Customer
    // ----------------------------------------------------
    await test('10. Vehicle conflict with another customer (flagged, not reassigned, safe response)', async () => {
      // Existing vehicle HR11AB1234 belongs to Vikas Sharma (testPhone1)
      const customerA = await Customer.findOne({ mobileNumber: testPhone1 });
      const initialVehicle = await Vehicle.findOne({ registrationNumberClean: 'HR11AB1234' });
      assert.strictEqual(initialVehicle.customerId.toString(), customerA._id.toString());

      // Customer B tries to book with the same plate HR11AB1234
      const customerBPhone = '9666655555';
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Pooja Rani',
          phone: customerBPhone,
          brand: 'Mahindra',
          model: 'Scorpio-N',
          registrationNumber: 'HR11AB1234', // Same plate registered to Customer A
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
        })
      });

      assert.strictEqual(res.status, 201, 'Booking should still be accepted with conflict flagged');
      const json = await res.json();
      assert.strictEqual(json.data.registrationConflict, true, 'registrationConflict flag must be true');
      assert.strictEqual(json.data.customer.fullName, 'Pooja Rani');

      // Verify that Customer A's vehicle was NOT silently reassigned to Customer B!
      const vehicleCheck = await Vehicle.findOne({ registrationNumberClean: 'HR11AB1234' });
      assert.strictEqual(
        vehicleCheck.customerId.toString(),
        customerA._id.toString(),
        'Vehicle must NOT be reassigned to Customer B'
      );

      // Verify appointment record in DB has conflict details in adminNotes
      const appointmentB = await Appointment.findOne({ bookingReference: json.data.bookingReference });
      assert.strictEqual(appointmentB.vehicleId, null, 'Conflicting vehicleId must not be linked');
      assert.ok(appointmentB.adminNotes.includes('FLAGGED REGISTRATION CONFLICT'), 'Admin notes must record conflict');
    });

    // ----------------------------------------------------
    // TEST 11: Missing Registration Number Behavior (Provisional Vehicle)
    // ----------------------------------------------------
    await test('11. Missing registration number behavior (creates provisional unplated vehicle)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Naveen Kumar',
          phone: '9555544444',
          brand: 'Maruti Suzuki',
          model: 'Baleno',
          // No registration number
          preferredDate: futureDate,
          preferredTimeSlot: 'Afternoon (12:00 PM - 03:00 PM)'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.vehicle.registrationNumber, '');

      const appointment = await Appointment.findOne({ bookingReference: json.data.bookingReference });
      assert.ok(appointment.vehicleId, 'Provisional vehicle record should be linked');

      const provisionalVeh = await Vehicle.findById(appointment.vehicleId);
      assert.strictEqual(provisionalVeh.isProvisional, true, 'Vehicle should be marked as provisional');
      assert.strictEqual(provisionalVeh.registrationNumberClean, null);
    });

    // ----------------------------------------------------
    // TEST 12: Idempotent Retry (Replay Cached Response)
    // ----------------------------------------------------
    await test('12. Idempotent retry returns original cached response', async () => {
      const retryRes = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': uuid1 }), // Reused key from Test 1
        body: JSON.stringify({
          name: 'Vikas Sharma',
          phone: testPhone1,
          brand: 'Mahindra',
          model: 'Scorpio-N',
          registrationNumber: 'HR 11 AB 1234',
          serviceIds: [activeService._id.toString()],
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
          problemDescription: 'Check engine oil and brake pads'
        })
      });

      assert.strictEqual(retryRes.status, 201, 'Replay should return original status 201');
      assert.strictEqual(retryRes.headers.get('x-cache-lookup'), 'HIT');
      assert.strictEqual(retryRes.headers.get('idempotent-replay'), 'true');

      const json = await retryRes.json();
      assert.strictEqual(json.data.bookingReference, validBookingRef, 'Replayed booking reference must match Test 1');
    });

    // ----------------------------------------------------
    // TEST 13: Idempotency Key Reused With Different Payload (HTTP 409)
    // ----------------------------------------------------
    await test('13. Idempotency key reused with different payload returns HTTP 409', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': uuid1 }), // Same key, completely different body
        body: JSON.stringify({
          name: 'Completely Different Name',
          phone: '9999911111',
          brand: 'Kia',
          model: 'Seltos',
          preferredDate: futureDate,
          preferredTimeSlot: 'Evening (03:00 PM - 07:00 PM)'
        })
      });

      assert.strictEqual(res.status, 409, 'Must return HTTP 409 Conflict');
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH');
    });

    // ----------------------------------------------------
    // TEST 14: Concurrent Identical Requests Handled Safely
    // ----------------------------------------------------
    await test('14. Concurrent identical requests handled safely', async () => {
      const sharedKey = crypto.randomUUID();
      const sharedBody = JSON.stringify({
        name: 'Concurrent Key User',
        phone: '9444433333',
        brand: 'Honda',
        model: 'City',
        preferredDate: futureDate,
        preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
      });

      const promises = Array.from({ length: 4 }).map(() =>
        fetch(`${BASE_URL}/api/v1/public/appointments`, {
          method: 'POST',
          headers: publicHeaders({ 'Idempotency-Key': sharedKey }),
          body: sharedBody
        })
      );

      const results = await Promise.all(promises);
      const bookingRefs = new Set();
      for (const res of results) {
        assert.ok([201].includes(res.status));
        const json = await res.json();
        bookingRefs.add(json.data.bookingReference);
      }

      // Exactly ONE appointment record created, rest were safe replays
      assert.strictEqual(bookingRefs.size, 1, 'All concurrent identical requests must resolve to the same booking reference');
    });

    // ----------------------------------------------------
    // TEST 15: Valid Public Customer Enquiry
    // ----------------------------------------------------
    let testEnquiryTicket = '';
    let testEnquiryId = '';
    await test('15. Valid enquiry submission with customer linking and PENDING status', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/enquiries`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Sunil Dahiya',
          phone: '9333322222',
          subject: 'Engine decarbonization price inquiry',
          message: 'How long does the Japanese engine carbon cleaning take for a Swift diesel?',
          preferredContactMethod: 'WHATSAPP'
        })
      });

      assert.strictEqual(res.status, 201, 'Should return HTTP 201 Created');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.ticketNumber, 'Ticket number must be generated');
      assert.strictEqual(json.data.status, 'PENDING');
      assert.strictEqual(json.data.customerName, 'Sunil Dahiya');

      testEnquiryTicket = json.data.ticketNumber;

      const createdEnquiry = await Enquiry.findOne({ ticketNumber: testEnquiryTicket });
      assert.ok(createdEnquiry);
      testEnquiryId = createdEnquiry._id.toString();
      assert.strictEqual(createdEnquiry.status, 'PENDING');

      // Verify customer was linked
      const customer = await Customer.findOne({ mobileNumber: '9333322222' });
      assert.ok(customer);
      assert.strictEqual(createdEnquiry.customerId.toString(), customer._id.toString());
    });

    // ----------------------------------------------------
    // TEST 16: Invalid Enquiry Rejection
    // ----------------------------------------------------
    await test('16. Invalid enquiry rejection (missing message or phone)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/enquiries`, {
        method: 'POST',
        headers: publicHeaders(),
        body: JSON.stringify({
          name: 'Sunil Dahiya',
          phone: '9333322222',
          message: 'Hi' // Too short (< 5 chars)
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
    });

    // ----------------------------------------------------
    // TEST 17: Public Rate Limiting
    // ----------------------------------------------------
    await test('17. Public rate limiting blocks excessive requests with 429', async () => {
      // Rapidly fire requests without bypass header to exhaust rate limit
      let got429 = false;
      for (let i = 0; i < 24; i++) {
        const res = await fetch(`${BASE_URL}/api/v1/public/enquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // No bypass header
          body: JSON.stringify({
            name: 'Rate Limit Tester',
            phone: '9111100000',
            message: 'Valid enquiry message to test rate limiter threshold'
          })
        });

        if (res.status === 429) {
          got429 = true;
          const json = await res.json();
          assert.strictEqual(json.error.code, 'RATE_LIMIT_EXCEEDED');
          break;
        }
      }

      assert.ok(got429, 'Rate limiter must enforce HTTP 429 when threshold exceeded');
    });

    // ----------------------------------------------------
    // TEST 18: Public Service Endpoint (Active Services Only, No Cost Data)
    // ----------------------------------------------------
    await test('18. Public service endpoint returns active services only without cost data', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/services`, {
        headers: { 'x-test-bypass-rate-limit': 'true' }
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 1);

      // Verify active service is present
      const activeFound = json.data.find((s) => s.slug === 'p3-active-service');
      assert.ok(activeFound, 'Active service must be present');
      assert.strictEqual(activeFound.title, 'Phase 3 Active Service');
      assert.ok(activeFound.priceDisplay);

      // Verify inactive service is EXCLUDED
      const inactiveFound = json.data.find((s) => s.slug === 'p3-inactive-service');
      assert.strictEqual(inactiveFound, undefined, 'Inactive service must NOT be returned');

      // Verify internal admin fields are NOT exposed
      for (const svc of json.data) {
        assert.strictEqual(svc.internalCost, undefined, 'internalCost must not be exposed');
        assert.strictEqual(svc.margin, undefined, 'margin must not be exposed');
      }
    });

    // ----------------------------------------------------
    // TEST 19: Unauthenticated Public Booking Works
    // ----------------------------------------------------
    await test('19. Unauthenticated public booking works without cookies or auth headers', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Anonymous Public Customer',
          phone: '9222211111',
          brand: 'Toyota',
          model: 'Innova Crysta',
          preferredDate: futureDate,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)'
        })
      });

      assert.strictEqual(res.status, 201, 'Public user should book without authentication');
    });

    // ----------------------------------------------------
    // TEST 20: OWNER Can Access Operational APIs (List, Get, Status Update)
    // ----------------------------------------------------
    await test('20. OWNER can access operational appointment & enquiry APIs', async () => {
      // 1. List appointments
      const listRes = await fetch(`${BASE_URL}/api/v1/admin/appointments`, {
        headers: {
          Cookie: cookieHeader(ownerAuth.cookies)
        }
      });
      assert.strictEqual(listRes.status, 200);
      const listJson = await listRes.json();
      assert.ok(Array.isArray(listJson.data));

      // 2. Get appointment by ID
      const getRes = await fetch(`${BASE_URL}/api/v1/admin/appointments/${validBookingId}`, {
        headers: {
          Cookie: cookieHeader(ownerAuth.cookies)
        }
      });
      assert.strictEqual(getRes.status, 200);
      const getJson = await getRes.json();
      assert.strictEqual(getJson.data.bookingReference, validBookingRef);

      // 3. Update appointment status (PATCH requires CSRF)
      const patchRes = await fetch(`${BASE_URL}/api/v1/admin/appointments/${validBookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
          reason: 'Bay 2 scheduled with certified mechanic'
        })
      });
      assert.strictEqual(patchRes.status, 200);
      const patchJson = await patchRes.json();
      assert.strictEqual(patchJson.data.status, 'CONFIRMED');

      // 4. Update enquiry status
      const enqPatchRes = await fetch(`${BASE_URL}/api/v1/admin/enquiries/${testEnquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          status: 'CONTACTED',
          resolutionNotes: 'Called customer on WhatsApp, quoted ₹1,799 for decarbonization'
        })
      });
      assert.strictEqual(enqPatchRes.status, 200);
    });

    // ----------------------------------------------------
    // TEST 21: SUPER_ADMIN Can Access Operational APIs
    // ----------------------------------------------------
    await test('21. SUPER_ADMIN can access operational appointment & enquiry APIs', async () => {
      // List appointments
      const listRes = await fetch(`${BASE_URL}/api/v1/admin/appointments`, {
        headers: {
          Cookie: cookieHeader(superAdminAuth.cookies)
        }
      });
      assert.strictEqual(listRes.status, 200);

      // Update appointment status to IN_PROGRESS
      const patchRes = await fetch(`${BASE_URL}/api/v1/admin/appointments/${validBookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          reason: 'Vehicle arrived at workshop, inspection in progress'
        })
      });
      assert.strictEqual(patchRes.status, 200);
      const patchJson = await patchRes.json();
      assert.strictEqual(patchJson.data.status, 'IN_PROGRESS');

      // Update enquiry status to RESOLVED
      const enqPatchRes = await fetch(`${BASE_URL}/api/v1/admin/enquiries/${testEnquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionNotes: 'Customer booked appointment for Saturday'
        })
      });
      assert.strictEqual(enqPatchRes.status, 200);
    });

    // ----------------------------------------------------
    // TEST 22: Unauthenticated Users Cannot Access Operational APIs
    // ----------------------------------------------------
    await test('22. Unauthenticated user rejected on operational APIs with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/appointments`);
      assert.strictEqual(res.status, 401, 'Must reject unauthenticated access with 401');

      const patchRes = await fetch(`${BASE_URL}/api/v1/admin/appointments/${validBookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.strictEqual(patchRes.status, 401);
    });

    // ----------------------------------------------------
    // TEST 23: SUPER_ADMIN Cannot Access Owner-Only Operations
    // ----------------------------------------------------
    await test('23. SUPER_ADMIN cannot access OWNER-only operations (403 Forbidden)', async () => {
      // SUPER_ADMIN attempts to list user accounts (/api/v1/admin/users)
      const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        headers: {
          Cookie: cookieHeader(superAdminAuth.cookies)
        }
      });
      assert.strictEqual(res.status, 403, 'SUPER_ADMIN must be blocked from owner-only routes');
    });

    // ----------------------------------------------------
    // TEST 24: Audit Logs Generated for Operational Status Changes
    // ----------------------------------------------------
    await test('24. Audit logs are generated for operational changes', async () => {
      const logs = await AuditLog.find({
        action: { $in: ['APPOINTMENT_STATUS_UPDATED', 'ENQUIRY_STATUS_UPDATED'] }
      }).sort({ createdAt: -1 });

      assert.ok(logs.length >= 2, 'At least 2 operational audit logs should exist');

      const apptLog = logs.find((l) => l.action === 'APPOINTMENT_STATUS_UPDATED');
      assert.ok(apptLog);
      assert.strictEqual(apptLog.entityType, 'Appointment');
      assert.ok(apptLog.diff.before.status);
      assert.ok(apptLog.diff.after.status);

      const enqLog = logs.find((l) => l.action === 'ENQUIRY_STATUS_UPDATED');
      assert.ok(enqLog);
      assert.strictEqual(enqLog.entityType, 'Enquiry');
    });

    // ----------------------------------------------------
    // TEST 25: Invalid Appointment Status Transition Rejected
    // ----------------------------------------------------
    await test('25. Invalid appointment status transition rejected with 400', async () => {
      // validBookingId is currently IN_PROGRESS; attempting to move back to PENDING is forbidden
      const patchRes = await fetch(`${BASE_URL}/api/v1/admin/appointments/${validBookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          status: 'PENDING'
        })
      });
      assert.strictEqual(patchRes.status, 400);
      const json = await patchRes.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'INVALID_STATUS_TRANSITION');
    });

    // ----------------------------------------------------
    // TEST 26: Invalid Enquiry Status Transition Rejected
    // ----------------------------------------------------
    await test('26. Invalid enquiry status transition rejected with 400', async () => {
      // testEnquiryId is currently RESOLVED; attempting to move back to NEW is forbidden
      const patchRes = await fetch(`${BASE_URL}/api/v1/admin/enquiries/${testEnquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          status: 'NEW'
        })
      });
      assert.strictEqual(patchRes.status, 400);
      const json = await patchRes.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'INVALID_STATUS_TRANSITION');
    });

    // ----------------------------------------------------
    // TEST 27: Repeated Bookings Without Registration Plate Reuse Provisional Vehicle
    // ----------------------------------------------------
    await test('27. Repeated booking without plate reuses provisional vehicle (no duplicate vehicles)', async () => {
      const customer = await Customer.findOne({ mobileNumber: '9555544444' });
      assert.ok(customer);

      const countBefore = await Vehicle.countDocuments({
        customerId: customer._id,
        isProvisional: true,
        brand: 'Maruti Suzuki',
        model: 'Baleno'
      });
      assert.strictEqual(countBefore, 1, 'Should have exactly 1 provisional vehicle from Test 11');

      // Book again without registration plate for the same car
      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: publicHeaders({ 'Idempotency-Key': crypto.randomUUID() }),
        body: JSON.stringify({
          name: 'Naveen Kumar',
          phone: '9555544444',
          brand: 'Maruti Suzuki',
          model: 'Baleno',
          preferredDate: futureDate,
          preferredTimeSlot: 'Evening (03:00 PM - 07:00 PM)'
        })
      });
      assert.strictEqual(res.status, 201);

      const countAfter = await Vehicle.countDocuments({
        customerId: customer._id,
        isProvisional: true,
        brand: 'Maruti Suzuki',
        model: 'Baleno'
      });
      assert.strictEqual(countAfter, 1, 'Must NOT create duplicate provisional vehicle for same customer and car');
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} PHASE 3 TESTS PASSED SUCCESSFULLY! `);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }

    // Cleanup Phase 3 temporary test records
    try {
      await User.deleteMany({ email: { $in: ['p3owner@test.com', 'p3super@test.com'] } });
      await Customer.deleteMany({
        mobileNumber: {
          $in: [
            '9876543210',
            '9777788888',
            '9666655555',
            '9555544444',
            '9444433333',
            '9333322222',
            '9222211111',
            '9111100000'
          ]
        }
      });
      await Vehicle.deleteMany({
        $or: [
          { registrationNumberClean: { $in: ['HR11AB1234', 'HR11TEST99'] } },
          { model: 'Baleno', brand: 'Maruti Suzuki' }
        ]
      });
      await Appointment.deleteMany({
        $or: [
          { bookingReference: /MHG-.*-.*/ },
          { idempotencyKey: /^[0-9a-f-]{36}$/i }
        ]
      });
      await Enquiry.deleteMany({
        ticketNumber: /ENQ-.*-.*/
      });
      await IdempotencyRecord.deleteMany({
        key: /^[0-9a-f-]{36}$/i
      });
      await Service.deleteMany({
        slug: { $in: ['p3-active-service', 'p3-inactive-service'] }
      });
    } catch {
      // Ignore cleanup error
    }

    await disconnectDB();
  }
}

runPhase3Tests().catch((err) => {
  console.error('\n[Phase 3 Test Suite Aborted]:', err);
  process.exit(1);
});
