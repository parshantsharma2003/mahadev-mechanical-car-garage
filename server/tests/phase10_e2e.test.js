/**
 * Phase 10 Comprehensive End-to-End & Production Hardening Test Suite
 * Mahadev Mechanical Car Garage
 *
 * Covers:
 * - Liveness & Readiness Probes (/health, /ready)
 * - Workflow A: Public Appointment & Idempotency
 * - Workflow B: Job Card Lifecycle & Inspection Snapshots
 * - Workflow C: Estimate Calculation, Revisions & Customer Approval
 * - Workflow D: Invoice Issuance, Partial Payments & Customer Khatta Reconciliation
 * - Workflow E: Expense Recording & Owner Reversal
 * - Workflow F: Supplier Procurement, Disbursements & Supplier Khatta
 * - Workflow G: Business Analytics Reconciliation & CSV Export
 * - Role-Based Access Control (OWNER vs SUPER_ADMIN vs Public Unauthenticated)
 * - Security Session Invalidation & CSRF Protection
 */

import assert from 'assert';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import {
  User,
  Customer,
  Vehicle,
  Appointment,
  JobCard,
  ServiceEstimate,
  Invoice,
  Payment,
  CustomerLedgerEntry,
  Expense,
  Supplier,
  SupplierPurchase,
  SupplierPayment,
  SupplierLedgerEntry,
  AuditLog
} from '../src/models/index.js';

dotenv.config();

const TEST_PORT = 5095;
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

async function runPhase10E2ETests() {
  console.log('\n======================================================');
  console.log('   MAHADEV GARAGE - PHASE 10 PRODUCTION E2E SUITE     ');
  console.log('======================================================\n');

  let server;
  let passedCount = 0;
  let totalCount = 0;

  const test = async (name, fn) => {
    totalCount++;
    try {
      await fn();
      passedCount++;
      console.log(`  ✓ [TEST ${totalCount}] ${name}`);
    } catch (err) {
      console.error(`  ✗ [TEST ${totalCount} FAILED] ${name}`);
      console.error('    Error:', err.message);
      if (err.stack) {
        console.error('    Stack:', err.stack.split('\n').slice(1, 4).join('\n'));
      }
      throw err;
    }
  };

  try {
    await connectDB();
    server = app.listen(TEST_PORT);
    console.log(`[Phase 10 Test Server] Listening on ${BASE_URL}\n`);

    // Setup Test Users
    const ownerEmail = `p10_owner_${Date.now()}@test.com`;
    const adminEmail = `p10_admin_${Date.now()}@test.com`;
    const defaultPassword = 'TestPassword#2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const ownerUser = await User.create({
      fullName: 'Phase 10 Garage Owner',
      email: ownerEmail,
      passwordHash: passwordHash,
      role: 'OWNER',
      phone: '9991112233',
      isActive: true,
      tokenVersion: 0
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 10 Service Advisor',
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'SUPER_ADMIN',
      phone: '9991112244',
      isActive: true,
      tokenVersion: 0
    });

    let ownerCookies = {};
    let ownerCsrf = '';
    let adminCookies = {};
    let adminCsrf = '';

    // ==========================================
    // MODULE 1: HEALTH & READINESS PROBES
    // ==========================================
    await test('Health check endpoints (/health and /api/v1/health) return healthy 200', async () => {
      const res1 = await fetch(`${BASE_URL}/health`);
      assert.strictEqual(res1.status, 200);
      const json1 = await res1.json();
      assert.strictEqual(json1.success, true);
      assert.strictEqual(json1.status, 'healthy');

      const res2 = await fetch(`${BASE_URL}/api/v1/health`);
      assert.strictEqual(res2.status, 200);
      const json2 = await res2.json();
      assert.strictEqual(json2.success, true);
      assert.strictEqual(json2.status, 'healthy');
    });

    await test('Readiness check endpoints (/ready and /api/v1/ready) confirm DB connectivity', async () => {
      const res1 = await fetch(`${BASE_URL}/ready`);
      assert.strictEqual(res1.status, 200);
      const json1 = await res1.json();
      assert.strictEqual(json1.success, true);
      assert.strictEqual(json1.status, 'ready');
      assert.strictEqual(json1.database, 'connected');

      const res2 = await fetch(`${BASE_URL}/api/v1/ready`);
      assert.strictEqual(res2.status, 200);
      const json2 = await res2.json();
      assert.strictEqual(json2.success, true);
      assert.strictEqual(json2.status, 'ready');
      assert.strictEqual(json2.database, 'connected');
    });

    // ==========================================
    // MODULE 2: AUTHENTICATION & CSRF ISSUANCE
    // ==========================================
    await test('Owner login establishes HttpOnly auth cookie and CSRF cookie', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, password: defaultPassword })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, 'OWNER');
      assert.ok(json.data.csrfToken);

      ownerCookies = extractCookies(res);
      assert.ok(ownerCookies.mahadev_admin_token, 'mahadev_admin_token cookie must be set');
      assert.ok(ownerCookies.mahadev_csrf_token, 'mahadev_csrf_token cookie must be set');
      ownerCsrf = json.data.csrfToken;
    });

    await test('SuperAdmin login establishes valid operational credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: defaultPassword })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, 'SUPER_ADMIN');

      adminCookies = extractCookies(res);
      adminCsrf = json.data.csrfToken;
    });

    // ==========================================
    // WORKFLOW A: PUBLIC APPOINTMENT & IDEMPOTENCY
    // ==========================================
    let createdAppointmentId = null;
    let appointmentBookingRef = null;
    const appointmentIdempotencyKey = randomUUID();
    const customerMobile = `98123${String(Date.now()).slice(-5)}`;

    const vehiclePlate = `HR 11 P ${String(Date.now()).slice(-4)}`;

    await test('Workflow A: Public appointment submission creates booking with idempotency', async () => {
      const bookingPayload = {
        fullName: 'Ramesh Verma',
        mobileNumber: customerMobile,
        email: 'ramesh.verma@example.com',
        brand: 'Mahindra',
        model: 'Scorpio-N',
        registrationNumber: vehiclePlate,
        fuelType: 'DIESEL',
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
        preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
        problemDescription: 'Suspension squeaking noise over rough roads and 40K service',
        serviceIds: []
      };

      const res = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': appointmentIdempotencyKey
        },
        body: JSON.stringify(bookingPayload)
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.bookingReference);
      appointmentBookingRef = json.data.bookingReference;

      // Public API does not expose internal _id, retrieve by bookingReference
      const apptRecord = await Appointment.findOne({ bookingReference: appointmentBookingRef });
      assert.ok(apptRecord, 'Appointment document must exist in database');
      createdAppointmentId = apptRecord._id;

      // Duplicate submission test with same idempotency key
      const dupeRes = await fetch(`${BASE_URL}/api/v1/public/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': appointmentIdempotencyKey
        },
        body: JSON.stringify(bookingPayload)
      });

      assert.ok([200, 201].includes(dupeRes.status), 'Idempotent replay returns 200 or 201');
      const dupeJson = await dupeRes.json();
      assert.strictEqual(dupeJson.data.bookingReference, appointmentBookingRef, 'Idempotent resubmission must return identical booking reference');
    });

    // ==========================================
    // WORKFLOW B: WORKSHOP JOB CARD & INSPECTION
    // ==========================================
    let createdJobCardId = null;
    let createdCustomerId = null;
    let createdVehicleId = null;

    await test('Workflow B: Convert confirmed appointment into Job Card with vehicle inspection', async () => {
      // 1. Confirm appointment
      const confirmRes = await fetch(`${BASE_URL}/api/v1/admin/appointments/${createdAppointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
          adminNotes: 'Appointment confirmed with customer via phone'
        })
      });
      if (confirmRes.status !== 200) {
        const errJson = await confirmRes.json();
        console.error('confirmRes failed:', confirmRes.status, errJson);
      }
      assert.strictEqual(confirmRes.status, 200);

      // 2. Fetch created Customer and Vehicle from appointment
      const apptDoc = await Appointment.findById(createdAppointmentId);
      createdCustomerId = apptDoc.customerId;
      createdVehicleId = apptDoc.vehicleId;

      // 3. Create Job Card from Appointment
      const jcPayload = {
        appointmentId: createdAppointmentId,
        customerId: createdCustomerId,
        vehicleId: createdVehicleId,
        customerSnapshot: {
          fullName: 'Ramesh Verma',
          mobileNumber: customerMobile,
          email: 'ramesh.verma@example.com',
          city: 'Gohana'
        },
        vehicleSnapshot: {
          brand: 'Mahindra',
          model: 'Scorpio-N',
          registrationNumber: vehiclePlate,
          registrationNumberClean: vehiclePlate.replace(/\s+/g, ''),
          fuelType: 'DIESEL',
          odometerReading: 42150
        },
        requestedServices: ['General Service', 'Suspension Inspection'],
        odometerReading: 42150,
        fuelLevel: 'HALF',
        assignedMechanic: 'Suresh Mechanic'
      };

      const jcRes = await fetch(`${BASE_URL}/api/v1/job-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify(jcPayload)
      });

      if (jcRes.status !== 201) {
        const errJson = await jcRes.json();
        console.error('jcRes failed:', jcRes.status, errJson);
      }
      assert.strictEqual(jcRes.status, 201);
      const jcJson = await jcRes.json();
      assert.strictEqual(jcJson.success, true);
      assert.ok(jcJson.data.jobCardNumber);
      assert.strictEqual(jcJson.data.status, 'CREATED');
      createdJobCardId = jcJson.data._id;

      // Transition to INSPECTION
      const inspectRes = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          status: 'INSPECTION',
          notes: 'Commenced 40-point vehicle inspection'
        })
      });
      assert.strictEqual(inspectRes.status, 200);

      // Verify audit log exists
      const audit = await AuditLog.findOne({
        entityId: createdJobCardId,
        action: 'JOB_CARD_STATUS_UPDATED'
      });
      assert.ok(audit, 'Audit log entry must be recorded for status transition');
    });

    // ==========================================
    // WORKFLOW C: ESTIMATES & CUSTOMER APPROVAL
    // ==========================================
    let currentEstimateId = null;

    await test('Workflow C: Create service estimate, revise version, and record customer approval', async () => {
      // 1. Create v1 Estimate
      const estPayload = {
        items: [
          { itemName: 'Engine Oil Replacement', itemType: 'PART', quantity: 1, unitPrice: 3200, isCustomerApproved: false },
          { itemName: 'Oil Filter', itemType: 'PART', quantity: 1, unitPrice: 650, isCustomerApproved: false },
          { itemName: 'Front Suspension Link Rod', itemType: 'PART', quantity: 2, unitPrice: 1100, isCustomerApproved: false },
          { itemName: 'General Service Labour', itemType: 'LABOUR', quantity: 1, unitPrice: 1500, isCustomerApproved: false }
        ],
        discountAmount: 200,
        taxRate: 0,
        customerMessage: 'Please review estimate for parts and labour'
      };

      const estRes = await fetch(`${BASE_URL}/api/v1/job-cards/${createdJobCardId}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify(estPayload)
      });

      assert.strictEqual(estRes.status, 201);
      const estJson = await estRes.json();
      assert.strictEqual(estJson.data.versionNumber, 1);
      assert.strictEqual(estJson.data.grandTotal, 7350); // (3200 + 650 + 2200 + 1500) - 200 = 7350
      currentEstimateId = estJson.data._id;

      // 2. Revise Estimate to Version 2 (add Wheel Alignment)
      const revisePayload = {
        items: [
          ...estPayload.items,
          { itemName: 'Wheel Alignment & Balancing', itemType: 'LABOUR', quantity: 1, unitPrice: 650, isCustomerApproved: false }
        ],
        discountAmount: 300,
        taxRate: 0
      };

      const revRes = await fetch(`${BASE_URL}/api/v1/estimates/${currentEstimateId}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify(revisePayload)
      });

      assert.strictEqual(revRes.status, 201);
      const revJson = await revRes.json();
      assert.strictEqual(revJson.data.versionNumber, 2);
      assert.strictEqual(revJson.data.isCurrent, true);
      const v2EstimateId = revJson.data._id;

      // Check v1 is superseded
      const v1Doc = await ServiceEstimate.findById(currentEstimateId);
      assert.strictEqual(v1Doc.isCurrent, false);
      assert.strictEqual(v1Doc.status, 'SUPERSEDED');

      // 3. Record Customer Approval on v2
      const decisionRes = await fetch(`${BASE_URL}/api/v1/estimates/${v2EstimateId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          decision: 'APPROVED',
          approvalSource: 'PHONE',
          customerComment: 'Approved all work including alignment',
          approvedItemIndices: [0, 1, 2, 3, 4]
        })
      });

      if (decisionRes.status !== 200) {
        const errJson = await decisionRes.json();
        console.error('decisionRes failed:', decisionRes.status, errJson);
      }
      assert.strictEqual(decisionRes.status, 200);
      const decisionJson = await decisionRes.json();
      assert.strictEqual(decisionJson.data.status, 'APPROVED');

      // Verify Job Card reflects approval
      const jcUpdated = await JobCard.findById(createdJobCardId);
      assert.strictEqual(jcUpdated.estimateSummary.decision, 'APPROVED');
    });

    // ==========================================
    // WORKFLOW D: INVOICING & CUSTOMER KHATTA
    // ==========================================
    let createdInvoiceId = null;
    let payment1Id = null;

    await test('Workflow D: Invoice issuance, partial payments, and customer ledger reconciliation', async () => {
      // 1. Progress Job Card to COMPLETED
      await JobCard.findByIdAndUpdate(createdJobCardId, { status: 'COMPLETED' });

      // 2. Create Invoice from Job Card
      const invRes = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          jobCardId: createdJobCardId,
          customerId: createdCustomerId,
          vehicleId: createdVehicleId,
          customerSnapshot: {
            fullName: 'Ramesh Verma',
            mobileNumber: customerMobile,
            city: 'Gohana'
          },
          vehicleSnapshot: {
            brand: 'Mahindra',
            model: 'Scorpio-N',
            registrationNumberClean: vehiclePlate.replace(/\s+/g, '')
          },
          items: [
            { itemName: 'Engine Oil 5L', itemType: 'PART', quantity: 1, unitPrice: 3200, lineTotal: 3200 },
            { itemName: 'Oil Filter', itemType: 'PART', quantity: 1, unitPrice: 650, lineTotal: 650 },
            { itemName: 'Suspension Link Rods', itemType: 'PART', quantity: 2, unitPrice: 1100, lineTotal: 2200 },
            { itemName: 'Service & Alignment Labour', itemType: 'LABOUR', quantity: 1, unitPrice: 2150, lineTotal: 2150 }
          ],
          subtotal: 8200,
          discountAmount: 200,
          taxRate: 0,
          taxAmount: 0,
          finalAmount: 8000
        })
      });

      assert.strictEqual(invRes.status, 201);
      const invJson = await invRes.json();
      assert.strictEqual(invJson.data.invoiceStatus, 'DRAFT');
      createdInvoiceId = invJson.data._id;

      // 3. Issue Invoice
      const issueRes = await fetch(`${BASE_URL}/api/v1/invoices/${createdInvoiceId}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        }
      });
      assert.strictEqual(issueRes.status, 200);

      // Verify CustomerLedgerEntry for INVOICE_ISSUED
      const issueLedger = await CustomerLedgerEntry.findOne({
        customerId: createdCustomerId,
        entryType: 'INVOICE_ISSUED',
        sourceId: createdInvoiceId
      });
      assert.ok(issueLedger, 'Customer ledger entry for invoice issuance must exist');
      assert.strictEqual(issueLedger.amount, 8000);
      assert.strictEqual(issueLedger.direction, 'DEBIT');

      // 4. Record Partial Payment (₹5000 UPI)
      const pay1Res = await fetch(`${BASE_URL}/api/v1/invoices/${createdInvoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          amount: 5000,
          paymentMethod: 'UPI',
          transactionReference: 'UPI-TEST-12345',
          notes: 'Partial payment via PhonePe'
        })
      });
      assert.strictEqual(pay1Res.status, 201);
      const pay1Json = await pay1Res.json();
      payment1Id = pay1Json.data.payment._id;

      // Verify invoice balance is ₹3000 and status PARTIALLY_PAID
      const invAfterPay1 = await Invoice.findById(createdInvoiceId);
      assert.strictEqual(invAfterPay1.amountPaid, 5000);
      assert.strictEqual(invAfterPay1.balanceDue, 3000);
      assert.strictEqual(invAfterPay1.paymentStatus, 'PARTIALLY_PAID');

      // 5. Record Remaining Payment (₹3000 Cash)
      const pay2Res = await fetch(`${BASE_URL}/api/v1/invoices/${createdInvoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          amount: 3000,
          paymentMethod: 'CASH',
          notes: 'Settled remaining balance in cash'
        })
      });
      assert.strictEqual(pay2Res.status, 201);

      // Verify invoice balance is 0 and status PAID
      const invAfterPay2 = await Invoice.findById(createdInvoiceId);
      assert.strictEqual(invAfterPay2.amountPaid, 8000);
      assert.strictEqual(invAfterPay2.balanceDue, 0);
      assert.strictEqual(invAfterPay2.paymentStatus, 'PAID');

      // 6. Verify Customer Ledger entries
      const ledgerRes = await fetch(`${BASE_URL}/api/v1/customers/${createdCustomerId}/ledger`, {
        headers: {
          'Cookie': cookieHeader(ownerCookies)
        }
      });
      assert.strictEqual(ledgerRes.status, 200);
      const ledgerJson = await ledgerRes.json();
      assert.ok(Array.isArray(ledgerJson.data.entries));
      assert.strictEqual(ledgerJson.data.entries.length, 3); // 1 Invoice + 2 Payments
    });

    // ==========================================
    // WORKFLOW E: EXPENSE MANAGEMENT & REVERSAL
    // ==========================================
    let createdExpenseId = null;

    await test('Workflow E: Record workshop expense and reverse with OWNER authorization', async () => {
      // 1. Record an Expense
      const expRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          title: 'Torque Socket Set',
          category: 'TOOLS_EQUIPMENT',
          amount: 1450,
          paymentMethod: 'CASH',
          description: 'Heavy duty wheel nut torque socket set',
          expenseDate: new Date().toISOString()
        })
      });

      if (expRes.status !== 201) {
        const errJson = await expRes.json();
        console.error('expRes failed:', expRes.status, errJson);
      }
      assert.strictEqual(expRes.status, 201);
      const expJson = await expRes.json();
      assert.strictEqual(expJson.data.status, 'RECORDED');
      assert.strictEqual(expJson.data.amount, 1450);
      createdExpenseId = expJson.data._id;

      // 2. Reverse the Expense as OWNER
      const revExpRes = await fetch(`${BASE_URL}/api/v1/expenses/${createdExpenseId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          reversalReason: 'Duplicate invoice entered by accountant'
        })
      });

      assert.strictEqual(revExpRes.status, 200);
      const revExpJson = await revExpRes.json();
      assert.strictEqual(revExpJson.data.status, 'REVERSED');
      assert.strictEqual(revExpJson.data.reversalReason, 'Duplicate invoice entered by accountant');
    });

    // ==========================================
    // WORKFLOW F: SUPPLIER PROCUREMENT & KHATTA
    // ==========================================
    let createdSupplierId = null;
    let createdPurchaseId = null;
    let supplierPaymentId = null;

    await test('Workflow F: Supplier procurement, disbursements, and supplier digital khatta', async () => {
      // 1. Create Supplier
      const supCode = `SUP-T10-${String(Date.now()).slice(-4)}`;
      const supRes = await fetch(`${BASE_URL}/api/v1/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          supplierCode: supCode,
          businessName: `Haryana Auto Spares ${String(Date.now()).slice(-4)} Ltd`,
          contactPerson: 'Sunil Aggarwal',
          mobileNumber: `9812${String(Date.now()).slice(-6)}`,
          category: 'SPARE_PARTS',
          city: 'Gohana'
        })
      });

      assert.strictEqual(supRes.status, 201);
      const supJson = await supRes.json();
      createdSupplierId = supJson.data._id;

      // 2. Create Supplier Purchase
      const purRes = await fetch(`${BASE_URL}/api/v1/supplier-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          supplierId: createdSupplierId,
          supplierInvoiceNumber: `HAS-2026-${String(Date.now()).slice(-4)}`,
          purchaseStatus: 'DRAFT',
          purchaseDate: new Date().toISOString(),
          items: [
            { itemName: 'Mobil 1 5W-30 Synthetic 4L', category: 'ENGINE_OIL', quantity: 5, unitPrice: 2200, lineTotal: 11000 },
            { itemName: 'Bosch Brake Pads Scorpio', category: 'SPARE_PARTS', quantity: 4, unitPrice: 1250, lineTotal: 5000 }
          ],
          totalAmount: 16000
        })
      });

      assert.strictEqual(purRes.status, 201);
      const purJson = await purRes.json();
      createdPurchaseId = purJson.data._id;

      // Record purchase (CONFIRM)
      const recRes = await fetch(`${BASE_URL}/api/v1/supplier-purchases/${createdPurchaseId}/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        }
      });
      assert.strictEqual(recRes.status, 200);

      // Verify SupplierLedgerEntry
      const supLedger = await SupplierLedgerEntry.findOne({
        supplierId: createdSupplierId,
        entryType: 'PURCHASE',
        sourceId: createdPurchaseId
      });
      assert.ok(supLedger, 'Supplier ledger entry for purchase must exist');
      assert.strictEqual(supLedger.amount, 16000);

      // 3. Make Supplier Payment (₹10000 Bank Transfer)
      const supPayRes = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          purchaseId: createdPurchaseId,
          amount: 10000,
          paymentMethod: 'BANK_TRANSFER',
          paymentReferenceNumber: 'NEFT-MAHADEV-999',
          notes: 'Advance part payment for oil stock'
        })
      });
      assert.strictEqual(supPayRes.status, 201);
      const supPayJson = await supPayRes.json();
      supplierPaymentId = supPayJson.data._id || supPayJson.data.payment?._id;

      // 4. Reverse Supplier Payment as OWNER
      const revSupPayRes = await fetch(`${BASE_URL}/api/v1/supplier-payments/${supplierPaymentId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          reversalReason: 'Wrong bank transaction reference entered'
        })
      });
      assert.strictEqual(revSupPayRes.status, 200);

      // Verify reverse ledger entry exists
      const revSupLedger = await SupplierLedgerEntry.findOne({
        supplierId: createdSupplierId,
        entryType: 'PAYMENT_REVERSAL'
      });
      assert.ok(revSupLedger, 'Supplier ledger entry for payment reversal must exist');
    });

    // ==========================================
    // WORKFLOW G: BUSINESS ANALYTICS & CSV EXPORT
    // ==========================================
    await test('Workflow G: Business analytics report reconciliation and CSV export', async () => {
      // 1. Overview analytics
      const overviewRes = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: {
          'Cookie': cookieHeader(ownerCookies)
        }
      });
      assert.strictEqual(overviewRes.status, 200);
      const overviewJson = await overviewRes.json();
      assert.strictEqual(overviewJson.success, true);
      assert.ok(typeof overviewJson.data.revenue.totalInvoiced === 'number');
      assert.ok(overviewJson.data.revenue.totalInvoiced >= 8000, 'Billed revenue should include the ₹8000 invoice');

      // 2. Financial Summary trend data
      const summaryRes = await fetch(`${BASE_URL}/api/v1/analytics/financial-summary?months=6`, {
        headers: {
          'Cookie': cookieHeader(ownerCookies)
        }
      });
      assert.strictEqual(summaryRes.status, 200);
      const summaryJson = await summaryRes.json();
      assert.ok(Array.isArray(summaryJson.data.trendData));

      // Test CSV Export
      const exportRes = await fetch(`${BASE_URL}/api/v1/analytics/export?reportType=revenue&preset=today`, {
        headers: {
          'Cookie': cookieHeader(ownerCookies)
        }
      });

      assert.strictEqual(exportRes.status, 200);
      assert.ok(exportRes.headers.get('content-type').includes('text/csv'));
      const csvText = await exportRes.text();
      assert.ok(csvText.includes('Invoice #') || csvText.includes('Invoice'), 'CSV must include header columns');
    });

    // ==========================================
    // MODULE 3: ROLE-BASED ACCESS CONTROL (RBAC)
    // ==========================================
    await test('RBAC: SUPER_ADMIN is blocked (403) from OWNER-only routes', async () => {
      // 1. Audit logs access
      const auditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-logs`, {
        headers: { 'Cookie': cookieHeader(adminCookies) }
      });
      assert.strictEqual(auditRes.status, 403, 'SUPER_ADMIN must not access audit logs');

      // 2. User management
      const usersRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
        headers: { 'Cookie': cookieHeader(adminCookies) }
      });
      assert.strictEqual(usersRes.status, 403, 'SUPER_ADMIN must not access user management');

      // 3. Analytics
      const analyticsRes = await fetch(`${BASE_URL}/api/v1/analytics/financial-summary`, {
        headers: { 'Cookie': cookieHeader(adminCookies) }
      });
      assert.strictEqual(analyticsRes.status, 403, 'SUPER_ADMIN must not access financial analytics');

      // 4. Payment reversal
      const revRes = await fetch(`${BASE_URL}/api/v1/payments/${payment1Id}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(adminCookies),
          'X-CSRF-Token': adminCsrf
        },
        body: JSON.stringify({ reversalReason: 'Unauthorized attempt' })
      });
      assert.strictEqual(revRes.status, 403, 'SUPER_ADMIN must not reverse customer payments');
    });

    await test('RBAC: Unauthenticated guests are blocked (401) from admin APIs', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/admin/appointments`);
      assert.strictEqual(res.status, 401, 'Unauthenticated guest must receive 401 on admin routes');
    });

    await test('CSRF: Mutations without X-CSRF-Token are rejected (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies)
          // Missing X-CSRF-Token
        },
        body: JSON.stringify({
          category: 'CLEANING',
          amount: 250,
          paymentMethod: 'CASH',
          description: 'Workshop floor cleaner'
        })
      });
      assert.strictEqual(res.status, 403, 'State-changing mutation without CSRF token must be blocked');
    });

    // ==========================================
    // MODULE 4: SESSION REVOCATION & DEACTIVATION
    // ==========================================
    await test('Session invalidation: Changing password revokes active JWT token', async () => {
      const newPassword = 'NewSecretPassword#2026';
      const changeRes = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          currentPassword: defaultPassword,
          newPassword
        })
      });

      assert.strictEqual(changeRes.status, 200);

      // Verify that the OLD ownerCookies are now REJECTED
      const checkRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { 'Cookie': cookieHeader(ownerCookies) }
      });
      assert.strictEqual(checkRes.status, 401, 'Old session cookie must be rejected after password change increments tokenVersion');
    });

    await test('Deactivated user status immediately blocks access', async () => {
      // Deactivate superAdminUser
      await User.findByIdAndUpdate(superAdminUser._id, { isActive: false });

      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
        headers: { 'Cookie': cookieHeader(adminCookies) }
      });
      assert.strictEqual(res.status, 401, 'Deactivated account must be immediately rejected with 401');
      const errJson = await res.json();
      assert.strictEqual(errJson.error.code, 'ACCOUNT_INACTIVE');
    });

    console.log('\n======================================================');
    console.log(`   PHASE 10 E2E SUITE COMPLETE: ${passedCount}/${totalCount} TESTS PASSED`);
    console.log('======================================================\n');
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await disconnectDB();
  }
}

runPhase10E2ETests().catch(err => {
  console.error('\nFatal test failure:', err.message);
  process.exit(1);
});
