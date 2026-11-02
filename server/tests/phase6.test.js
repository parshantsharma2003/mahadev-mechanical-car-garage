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
  ServiceEstimate,
  AuditLog
} from '../src/models/index.js';

dotenv.config();

const TEST_PORT = 5080;
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

async function runPhase6Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 6 TEST SUITE            ');
  console.log('  SERVICE ESTIMATES & CUSTOMER APPROVAL WORKFLOW      ');
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

    await User.deleteMany({ email: { $in: ['p6owner@test.com', 'p6super@test.com'] } });

    const ownerUser = await User.create({
      fullName: 'Phase 6 Owner',
      email: 'p6owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      phone: '9866666611',
      isActive: true,
      tokenVersion: 0
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 6 Super Admin',
      email: 'p6super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      phone: '9877777722',
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

    const ownerAuth = await loginUser('p6owner@test.com');
    const superAdminAuth = await loginUser('p6super@test.com');

    // Clean up test data
    await ServiceEstimate.deleteMany({ estimateNumber: /^EST-/ });
    await JobCard.deleteMany({ jobCardNumber: /^JC-P6TEST-/ });
    await Customer.deleteMany({ mobileNumber: { $in: ['9881116666', '9882226666'] } });
    await Vehicle.deleteMany({ registrationNumberClean: { $in: ['HR11P601', 'HR11P602'] } });

    // Create Test Customer & Vehicles
    const customer = await Customer.create({
      fullName: 'Sunil Kumar',
      mobileNumber: '9881116666',
      email: 'sunil.p6@example.com',
      city: 'Gohana',
      address: 'Near Old Bus Stand'
    });

    const vehicle = await Vehicle.create({
      customerId: customer._id,
      brand: 'Mahindra',
      model: 'Scorpio-N',
      registrationNumberClean: 'HR11P601',
      registrationNumberDisplay: 'HR 11 P 601',
      fuelType: 'DIESEL',
      manufacturingYear: 2023
    });

    // Create Test Job Card
    const jobCard = await JobCard.create({
      jobCardNumber: 'JC-P6TEST-0001',
      customerId: customer._id,
      vehicleId: vehicle._id,
      customerSnapshot: {
        fullName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        city: 'Gohana'
      },
      vehicleSnapshot: {
        brand: vehicle.brand,
        model: vehicle.model,
        registrationNumber: 'HR 11 P 601',
        fuelType: 'DIESEL'
      },
      status: 'INSPECTION',
      inspectionNotes: 'Front brake pads worn out, engine oil dirty',
      createdBy: ownerUser._id,
      updatedBy: ownerUser._id
    });

    let createdEstimateId = '';
    let createdEstimateNumber = '';

    // ----------------------------------------------------
    // TEST 1: Estimate creation for a valid Job Card (201 Created)
    // ----------------------------------------------------
    await test('1. Estimate creation for a valid Job Card (201 Created)', async () => {
      const payload = {
        items: [
          {
            itemName: 'Front Brake Pads Replacement',
            description: 'Genuine OEM brake pads set',
            quantity: 1,
            unit: 'set',
            unitPrice: 2800,
            itemType: 'PART'
          },
          {
            itemName: 'Brake Caliper Servicing & Labour',
            quantity: 1,
            unit: 'job',
            unitPrice: 700,
            itemType: 'LABOUR'
          }
        ],
        discountAmount: 200,
        taxRate: 18,
        customerMessage: 'Please review estimate for brake replacement.'
      };

      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jobCard._id}/estimates`, {
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
      assert.ok(json.data.estimateNumber.startsWith('EST-'));
      assert.strictEqual(json.data.versionNumber, 1);
      assert.strictEqual(json.data.isCurrent, true);
      assert.strictEqual(json.data.status, 'DRAFT');
      assert.strictEqual(json.data.items.length, 2);

      // Verify subtotal = 2800 + 700 = 3500
      assert.strictEqual(json.data.subtotal, 3500);
      assert.strictEqual(json.data.discountAmount, 200);
      // Taxable = 3300, Tax (18%) = 594, Grand Total = 3894
      assert.strictEqual(json.data.taxAmount, 594);
      assert.strictEqual(json.data.grandTotal, 3894);

      createdEstimateId = json.data._id;
      createdEstimateNumber = json.data.estimateNumber;

      // Verify Job Card estimateSummary updated
      const freshJobCard = await JobCard.findById(jobCard._id);
      assert.strictEqual(freshJobCard.currentEstimateId.toString(), createdEstimateId);
      assert.strictEqual(freshJobCard.estimateSummary.grandTotal, 3894);
      assert.strictEqual(freshJobCard.estimateSummary.versionNumber, 1);
    });

    // ----------------------------------------------------
    // TEST 2: Reject estimate creation for a missing Job Card (404)
    // ----------------------------------------------------
    await test('2. Reject estimate creation for a missing Job Card (404 Not Found)', async () => {
      const bogusId = new mongoose.Types.ObjectId();
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${bogusId}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Test Item', quantity: 1, unitPrice: 500 }]
        })
      });

      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'NOT_FOUND');
    });

    // ----------------------------------------------------
    // TEST 3: Strict Backend Total Calculation (Ignore Client Tampering)
    // ----------------------------------------------------
    await test('3. Strict backend financial total calculation prevents client tampering', async () => {
      // Create second job card for test
      const jc2 = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-0002',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Customer Two', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      // Frontend attempts to tamper with subtotal and grandTotal
      const tamperedPayload = {
        items: [
          { itemName: 'Synthetic Engine Oil 5L', quantity: 5, unitPrice: 650, itemType: 'PART' }, // 3250
          { itemName: 'Oil Filter', quantity: 1, unitPrice: 450, itemType: 'PART' }               // 450
        ], // Subtotal = 3700
        subtotal: 100,      // Tampered fake subtotal
        discountAmount: 200,
        taxRate: 18,        // Taxable = 3500, Tax = 630
        grandTotal: 50      // Tampered fake grandTotal
      };

      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jc2._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify(tamperedPayload)
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      // Server must safely compute true amounts regardless of tampered client payload
      assert.strictEqual(json.data.subtotal, 3700);
      assert.strictEqual(json.data.discountAmount, 200);
      assert.strictEqual(json.data.taxAmount, 630);
      assert.strictEqual(json.data.grandTotal, 4130);
    });

    // ----------------------------------------------------
    // TEST 4: Invalid negative price rejection (400)
    // ----------------------------------------------------
    await test('4. Invalid negative price rejected with HTTP 400', async () => {
      const jc3 = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-0003',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Customer Three', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jc3._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Defective Price Part', quantity: 1, unitPrice: -500 }]
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('negative'));
    });

    // ----------------------------------------------------
    // TEST 5: Invalid quantity rejection (400)
    // ----------------------------------------------------
    await test('5. Invalid quantity rejection (<= 0) with HTTP 400', async () => {
      const jc4 = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-0004',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Customer Four', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jc4._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Zero Quantity Part', quantity: 0, unitPrice: 500 }]
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('greater than zero'));
    });

    // ----------------------------------------------------
    // TEST 6: Discount validation (cannot exceed subtotal or be negative)
    // ----------------------------------------------------
    await test('6. Discount validation rejects excess discount (400)', async () => {
      const jc5 = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-0005',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Customer Five', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      // Subtotal is 1000, discount is 2000
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jc5._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Standard Brake Service', quantity: 1, unitPrice: 1000 }],
          discountAmount: 2000
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.error.message.includes('cannot exceed subtotal'));
    });

    // ----------------------------------------------------
    // TEST 7: Unique estimate number generation
    // ----------------------------------------------------
    await test('7. Unique sequential estimate number generation (EST-YYYYMMDD-XXXX)', async () => {
      const est1 = await ServiceEstimate.findById(createdEstimateId);
      assert.ok(est1.estimateNumber);

      const jc6 = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-0006',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Customer Six', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jc6._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Battery Check', quantity: 1, unitPrice: 300 }]
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.notStrictEqual(json.data.estimateNumber, est1.estimateNumber);
      assert.ok(json.data.estimateNumber.startsWith('EST-'));
    });

    // ----------------------------------------------------
    // TEST 8: Concurrent active estimate creation rejected (409)
    // ----------------------------------------------------
    await test('8. Attempting to create duplicate active estimate for same Job Card rejected (409)', async () => {
      // jobCard 1 already has createdEstimateId active
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jobCard._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Duplicate Attempt', quantity: 1, unitPrice: 500 }]
        })
      });

      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'CURRENT_ESTIMATE_EXISTS');
    });

    // ----------------------------------------------------
    // TEST 9: Estimate revision and historical preservation (v1 -> v2)
    // ----------------------------------------------------
    let revisedEstimateId = '';
    await test('9. Estimate revision creates new version and supersedes previous version', async () => {
      const revisionPayload = {
        items: [
          {
            itemName: 'Front Brake Pads Replacement',
            quantity: 1,
            unit: 'set',
            unitPrice: 2800,
            itemType: 'PART'
          },
          {
            itemName: 'Brake Caliper Servicing & Labour',
            quantity: 1,
            unit: 'job',
            unitPrice: 700,
            itemType: 'LABOUR'
          },
          {
            itemName: 'Brake Disc Machining / Lathe Turning',
            description: 'Additional scope identified after rotor inspection',
            quantity: 2,
            unit: 'disc',
            unitPrice: 600,
            itemType: 'SERVICE'
          }
        ],
        discountAmount: 300,
        taxRate: 18,
        customerMessage: 'Revised estimate including brake disc lathe machining.'
      };

      const res = await fetch(`${BASE_URL}/api/v1/estimates/${createdEstimateId}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify(revisionPayload)
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.estimateNumber, createdEstimateNumber);
      assert.strictEqual(json.data.versionNumber, 2);
      assert.strictEqual(json.data.isCurrent, true);
      assert.strictEqual(json.data.status, 'DRAFT');

      revisedEstimateId = json.data._id;

      // Verify v1 historical preservation
      const v1Doc = await ServiceEstimate.findById(createdEstimateId);
      assert.strictEqual(v1Doc.versionNumber, 1);
      assert.strictEqual(v1Doc.isCurrent, false);
      assert.strictEqual(v1Doc.status, 'SUPERSEDED');
    });

    // ----------------------------------------------------
    // TEST 10: Approval of current estimate (200 OK)
    // ----------------------------------------------------
    await test('10. Sending and full approval of current estimate', async () => {
      // 1. Send estimate
      const sendRes = await fetch(`${BASE_URL}/api/v1/estimates/${revisedEstimateId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({})
      });
      assert.strictEqual(sendRes.status, 200);
      const sendJson = await sendRes.json();
      assert.strictEqual(sendJson.data.status, 'SENT');
      assert.ok(sendJson.data.sentAt);

      // Verify Job Card advanced to WAITING_FOR_APPROVAL
      const jcAfterSend = await JobCard.findById(jobCard._id);
      assert.strictEqual(jcAfterSend.status, 'WAITING_FOR_APPROVAL');

      // 2. Record Customer Approval
      const decisionRes = await fetch(`${BASE_URL}/api/v1/estimates/${revisedEstimateId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          decision: 'APPROVED',
          approvalSource: 'WHATSAPP',
          customerComment: 'Approved all items on WhatsApp, please finish today'
        })
      });

      assert.strictEqual(decisionRes.status, 200);
      const decisionJson = await decisionRes.json();
      assert.strictEqual(decisionJson.success, true);
      assert.strictEqual(decisionJson.data.status, 'APPROVED');
      assert.strictEqual(decisionJson.data.customerDecision.decision, 'APPROVED');
      assert.strictEqual(decisionJson.data.customerDecision.approvalSource, 'WHATSAPP');
      assert.strictEqual(decisionJson.data.customerDecision.customerName, 'Sunil Kumar');
      assert.strictEqual(decisionJson.data.customerDecision.recordedBy.toString(), ownerUser._id.toString());
      assert.strictEqual(decisionJson.data.items.every((it) => it.status === 'APPROVED'), true);

      // Verify Job Card estimateSummary status is APPROVED
      const jcAfterDecision = await JobCard.findById(jobCard._id);
      assert.strictEqual(jcAfterDecision.estimateSummary.status, 'APPROVED');
      assert.strictEqual(jcAfterDecision.estimateSummary.decision, 'APPROVED');
    });

    // ----------------------------------------------------
    // TEST 11: Partial approval with individual item status
    // ----------------------------------------------------
    let partialEstimateId = '';
    await test('11. Customer partial approval marks approved and rejected items', async () => {
      const jcPartial = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-PARTIAL',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Partial Customer', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      const estRes = await fetch(`${BASE_URL}/api/v1/job-cards/${jcPartial._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [
            { itemName: 'AC Condenser Cleaning', quantity: 1, unitPrice: 800, itemType: 'SERVICE' },
            { itemName: 'Rear Wiper Blade Replacement', quantity: 1, unitPrice: 400, itemType: 'PART' }
          ]
        })
      });
      const estJson = await estRes.json();
      partialEstimateId = estJson.data._id;

      // Customer approves item 0 (AC), but rejects item 1 (wiper)
      const decisionRes = await fetch(`${BASE_URL}/api/v1/estimates/${partialEstimateId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          decision: 'PARTIALLY_APPROVED',
          approvalSource: 'PHONE',
          approvedItemIndices: [0],
          customerComment: 'Clean AC now, will change wiper later'
        })
      });

      assert.strictEqual(decisionRes.status, 200);
      const json = await decisionRes.json();
      assert.strictEqual(json.data.status, 'PARTIALLY_APPROVED');
      assert.strictEqual(json.data.items[0].status, 'APPROVED');
      assert.strictEqual(json.data.items[1].status, 'REJECTED');
      assert.deepStrictEqual(json.data.customerDecision.approvedItemIndices, [0]);
      assert.deepStrictEqual(json.data.customerDecision.rejectedItemIndices, [1]);
    });

    // ----------------------------------------------------
    // TEST 12: Customer Rejection of Estimate
    // ----------------------------------------------------
    let rejectedEstimateId = '';
    let jcRejected = null;
    await test('12. Customer estimate rejection records decision and marks all items REJECTED', async () => {
      jcRejected = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-REJECT',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Reject Customer', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      const estRes = await fetch(`${BASE_URL}/api/v1/job-cards/${jcRejected._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Clutch Overhaul', quantity: 1, unitPrice: 12000, itemType: 'LABOUR' }]
        })
      });
      const estJson = await estRes.json();
      rejectedEstimateId = estJson.data._id;

      const decRes = await fetch(`${BASE_URL}/api/v1/estimates/${rejectedEstimateId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          decision: 'REJECTED',
          approvalSource: 'IN_PERSON',
          customerComment: 'Customer declined clutch overhaul at this time'
        })
      });

      assert.strictEqual(decRes.status, 200);
      const decJson = await decRes.json();
      assert.strictEqual(decJson.data.status, 'REJECTED');
      assert.strictEqual(decJson.data.items[0].status, 'REJECTED');
    });

    // ----------------------------------------------------
    // TEST 13: Rejection of superseded estimate approval (400)
    // ----------------------------------------------------
    await test('13. Attempting to decide on a superseded estimate version rejected (400)', async () => {
      // createdEstimateId is v1, which was superseded by v2
      const res = await fetch(`${BASE_URL}/api/v1/estimates/${createdEstimateId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          decision: 'APPROVED',
          approvalSource: 'PHONE'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'CANNOT_DECIDE_SUPERSEDED');
    });

    // ----------------------------------------------------
    // TEST 14: Duplicate decision prevention (409)
    // ----------------------------------------------------
    await test('14. Duplicate customer decision submission on decided estimate rejected (409)', async () => {
      // revisedEstimateId is already APPROVED in Test 10
      const res = await fetch(`${BASE_URL}/api/v1/estimates/${revisedEstimateId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          decision: 'REJECTED',
          approvalSource: 'WHATSAPP'
        })
      });

      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, 'ESTIMATE_ALREADY_DECIDED');
    });

    // ----------------------------------------------------
    // TEST 15: AuditLog creation for estimate actions
    // ----------------------------------------------------
    await test('15. Comprehensive AuditLog records created for estimate lifecycle', async () => {
      const logs = await AuditLog.find({
        action: {
          $in: [
            'ESTIMATE_CREATED',
            'ESTIMATE_REVISED',
            'ESTIMATE_APPROVED',
            'ESTIMATE_PARTIALLY_APPROVED',
            'ESTIMATE_REJECTED'
          ]
        }
      });

      assert.ok(logs.length >= 4);
      const actions = logs.map((l) => l.action);
      assert.ok(actions.includes('ESTIMATE_CREATED'));
      assert.ok(actions.includes('ESTIMATE_REVISED'));
      assert.ok(actions.includes('ESTIMATE_APPROVED'));
      assert.ok(actions.includes('ESTIMATE_PARTIALLY_APPROVED'));
      assert.ok(actions.includes('ESTIMATE_REJECTED'));
    });

    // ----------------------------------------------------
    // TEST 16: OWNER and SUPER_ADMIN permission matrix
    // ----------------------------------------------------
    await test('16. SUPER_ADMIN can manage estimates, but cannot access OWNER-only exception authorization', async () => {
      // 1. SUPER_ADMIN can create an estimate
      const jcSuper = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-SUPER',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Super Test', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: superAdminUser._id
      });

      const resCreate = await fetch(`${BASE_URL}/api/v1/job-cards/${jcSuper._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        },
        body: JSON.stringify({
          items: [{ itemName: 'Brake Fluid Flush', quantity: 1, unitPrice: 650 }]
        })
      });
      assert.strictEqual(resCreate.status, 201);

      // 2. SUPER_ADMIN attempting OWNER-only record-exception is strictly forbidden (403)
      const resException = await fetch(`${BASE_URL}/api/v1/job-cards/${jcSuper._id}/record-exception`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superAdminAuth.cookies),
          'X-CSRF-Token': superAdminAuth.csrfToken
        },
        body: JSON.stringify({ reason: 'Trying unauthorized bypass' })
      });
      assert.strictEqual(resException.status, 403);
      const jsonEx = await resException.json();
      assert.strictEqual(jsonEx.error.code, 'FORBIDDEN_OWNER_ONLY');
    });

    // ----------------------------------------------------
    // TEST 17: Unauthenticated request rejection (401)
    // ----------------------------------------------------
    await test('17. Unauthenticated requests to estimate endpoints rejected with HTTP 401', async () => {
      const resGet = await fetch(`${BASE_URL}/api/v1/job-cards/${jobCard._id}/estimates`);
      assert.strictEqual(resGet.status, 401);

      const resPost = await fetch(`${BASE_URL}/api/v1/estimates/${createdEstimateId}/send`, {
        method: 'POST'
      });
      assert.strictEqual(resPost.status, 401);
    });

    // ----------------------------------------------------
    // TEST 18: CSRF protection on mutation routes (403)
    // ----------------------------------------------------
    await test('18. Estimate mutation routes without valid CSRF rejected with HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/job-cards/${jobCard._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies)
          // Missing X-CSRF-Token
        },
        body: JSON.stringify({
          items: [{ itemName: 'No CSRF Item', quantity: 1, unitPrice: 100 }]
        })
      });
      assert.strictEqual(res.status, 403);
    });

    // ----------------------------------------------------
    // TEST 19: Approved estimate integration with Job Card status
    // ----------------------------------------------------
    await test('19. Transition to IN_PROGRESS succeeds with approved estimate, fails without one', async () => {
      // 1. jobCard 1 has revisedEstimateId APPROVED -> Transition to IN_PROGRESS must succeed
      const resValid = await fetch(`${BASE_URL}/api/v1/job-cards/${jobCard._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'IN_PROGRESS', notes: 'Approved work commenced' })
      });
      assert.strictEqual(resValid.status, 200);
      const jsonValid = await resValid.json();
      assert.strictEqual(jsonValid.data.status, 'IN_PROGRESS');

      // 2. jcRejected has only a REJECTED estimate -> Transition to IN_PROGRESS must be rejected (400)
      const resRejectedJob = await fetch(`${BASE_URL}/api/v1/job-cards/${jcRejected._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });
      assert.strictEqual(resRejectedJob.status, 400);
      const jsonRej = await resRejectedJob.json();
      assert.strictEqual(jsonRej.error.code, 'ESTIMATE_APPROVAL_REQUIRED');
    });

    // ----------------------------------------------------
    // TEST 20: Additional work requires revised estimate and fresh approval
    // ----------------------------------------------------
    await test('20. Additional work identified in workshop requires new estimate version', async () => {
      // Current estimate on jobCard 1 is v2 (revisedEstimateId).
      // Workshop finds leak in radiator while in progress -> calls revise
      const resRevise = await fetch(`${BASE_URL}/api/v1/estimates/${revisedEstimateId}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          items: [
            { itemName: 'Front Brake Pads', quantity: 1, unitPrice: 2800 },
            { itemName: 'Radiator Hose Replacement (Additional Work)', quantity: 1, unitPrice: 1200, itemType: 'PART' }
          ],
          customerMessage: 'Additional leak found during road testing'
        })
      });

      assert.strictEqual(resRevise.status, 201);
      const jsonRevise = await resRevise.json();
      assert.strictEqual(jsonRevise.data.versionNumber, 3);
      assert.strictEqual(jsonRevise.data.status, 'DRAFT');

      // Job Card summary reflects new DRAFT version requiring fresh approval
      const freshJobCard = await JobCard.findById(jobCard._id);
      assert.strictEqual(freshJobCard.estimateSummary.versionNumber, 3);
      assert.strictEqual(freshJobCard.estimateSummary.status, 'DRAFT');
    });

    // ----------------------------------------------------
    // TEST 21: OWNER-authorized no-estimate exception
    // ----------------------------------------------------
    await test('21. OWNER-authorized no-estimate exception allows workshop work with audit trail', async () => {
      // Create job card with no estimate
      const jcEmergency = await JobCard.create({
        jobCardNumber: 'JC-P6TEST-EMERGENCY',
        customerId: customer._id,
        vehicleId: vehicle._id,
        customerSnapshot: { fullName: 'Emergency Walkin', mobileNumber: '9881116666' },
        vehicleSnapshot: { brand: 'Mahindra', model: 'Scorpio-N' },
        status: 'INSPECTION',
        createdBy: ownerUser._id
      });

      // Attempting IN_PROGRESS without estimate fails
      const resFail = await fetch(`${BASE_URL}/api/v1/job-cards/${jcEmergency._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });
      assert.strictEqual(resFail.status, 400);

      // OWNER records exception
      const resEx = await fetch(`${BASE_URL}/api/v1/job-cards/${jcEmergency._id}/record-exception`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({
          reason: 'Emergency highway tow-in: owner verbally requested immediate coolant overhaul'
        })
      });
      assert.strictEqual(resEx.status, 200);

      // Verify exception fields on JobCard
      const freshEx = await JobCard.findById(jcEmergency._id);
      assert.strictEqual(freshEx.noEstimateException.isAuthorized, true);
      assert.strictEqual(freshEx.noEstimateException.authorizedBy.toString(), ownerUser._id.toString());
      assert.ok(freshEx.noEstimateException.authorizedAt);

      // Transition to IN_PROGRESS now succeeds
      const resSuccess = await fetch(`${BASE_URL}/api/v1/job-cards/${jcEmergency._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerAuth.cookies),
          'X-CSRF-Token': ownerAuth.csrfToken
        },
        body: JSON.stringify({ status: 'IN_PROGRESS', notes: 'Emergency work started under OWNER exception' })
      });
      assert.strictEqual(resSuccess.status, 200);
      const jsonSucc = await resSuccess.json();
      assert.strictEqual(jsonSucc.data.status, 'IN_PROGRESS');

      // Verify AuditLog for exception
      const exLog = await AuditLog.findOne({
        action: 'NO_ESTIMATE_EXCEPTION_AUTHORIZED',
        entityId: jcEmergency._id
      });
      assert.ok(exLog);
      assert.strictEqual(exLog.actorRole, 'OWNER');
    });

    // ----------------------------------------------------
    // TEST 22: Regression tests for Phases 1–5 integrity
    // ----------------------------------------------------
    await test('22. Regression verification: Public endpoints, booking, and Job Cards operational', async () => {
      // 1. Health check endpoint
      const resHealth = await fetch(`${BASE_URL}/api/v1/health`);
      assert.strictEqual(resHealth.status, 200);
      const jsonHealth = await resHealth.json();
      assert.strictEqual(jsonHealth.success, true);
      assert.strictEqual(jsonHealth.service, 'mahadev-garage-backend');

      // 2. Fetch Job Cards list
      const resList = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(resList.status, 200);
      const jsonList = await resList.json();
      assert.ok(jsonList.data.length > 0);

      // 3. Fetch single Job Card
      const resSingle = await fetch(`${BASE_URL}/api/v1/job-cards/${jobCard._id}`, {
        headers: { Cookie: cookieHeader(ownerAuth.cookies) }
      });
      assert.strictEqual(resSingle.status, 200);
      const jsonSingle = await resSingle.json();
      assert.strictEqual(jsonSingle.data.jobCardNumber, jobCard.jobCardNumber);
    });

    console.log(`\n======================================================`);
    console.log(` PHASE 6 RESULTS: ${passedTests}/${totalTests} TESTS PASSED `);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('\n Phase 6 Test execution failed:\n', err);
    process.exitCode = 1;
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await disconnectDB();
  }
}

runPhase6Tests();
