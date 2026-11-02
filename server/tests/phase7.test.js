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
  AuditLog
} from '../src/models/index.js';

dotenv.config();

const TEST_PORT = 5090;
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

async function runPhase7Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 7 TEST SUITE            ');
  console.log('  BILLING, INVOICES & DIGITAL CUSTOMER KHATTA         ');
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

    // Cleanup previous test data
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);

    await User.deleteMany({ email: { $in: ['p7owner@test.com', 'p7super@test.com'] } });
    await Customer.deleteMany({ mobileNumber: { $in: ['9812347001', '9812347002'] } });
    await Vehicle.deleteMany({ registrationNumberClean: { $in: ['HR11P701', 'HR11P702'] } });

    const ownerUser = await User.create({
      fullName: 'Phase 7 Owner',
      email: 'p7owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      phone: '9866667711',
      isActive: true,
      tokenVersion: 0
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 7 Super Admin',
      email: 'p7super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      phone: '9877778822',
      isActive: true,
      tokenVersion: 0
    });

    // Login helper
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

    const ownerSession = await loginUser('p7owner@test.com');
    const superSession = await loginUser('p7super@test.com');

    // Create Customer & Vehicle for testing
    const testCustomer = await Customer.create({
      fullName: 'Ramesh Phase 7 Khatta',
      mobileNumber: '9812347001',
      email: 'ramesh.p7@test.com',
      city: 'Gohana',
      address: 'Near Old Bus Stand, Gohana'
    });

    const testVehicle = await Vehicle.create({
      registrationNumberRaw: 'HR 11 P 7001',
      registrationNumberClean: 'HR11P701',
      registrationNumberDisplay: 'HR-11-P-7001',
      brand: 'Maruti Suzuki',
      model: 'Swift Dzire',
      fuelType: 'PETROL',
      customerId: testCustomer._id
    });

    // Create Job Card 1 (Completed)
    const completedJobCard = await JobCard.create({
      jobCardNumber: 'JC-20261031-7001',
      customerId: testCustomer._id,
      vehicleId: testVehicle._id,
      customerSnapshot: {
        fullName: testCustomer.fullName,
        mobileNumber: testCustomer.mobileNumber
      },
      vehicleSnapshot: {
        registrationNumber: testVehicle.registrationNumberDisplay,
        brand: testVehicle.brand,
        model: testVehicle.model
      },
      status: 'COMPLETED',
      fuelLevel: 'HALF',
      odometerReading: 45000,
      createdBy: ownerUser._id
    });

    // Create Job Card 2 (In Progress - for gating tests)
    const inProgressJobCard = await JobCard.create({
      jobCardNumber: 'JC-20261031-7002',
      customerId: testCustomer._id,
      vehicleId: testVehicle._id,
      customerSnapshot: {
        fullName: testCustomer.fullName,
        mobileNumber: testCustomer.mobileNumber
      },
      vehicleSnapshot: {
        registrationNumber: testVehicle.registrationNumberDisplay,
        brand: testVehicle.brand,
        model: testVehicle.model
      },
      status: 'IN_PROGRESS',
      fuelLevel: 'QUARTER',
      odometerReading: 32000,
      createdBy: ownerUser._id
    });

    let draftInvoiceId = null;
    let draftInvoiceNumber = null;
    let issuedInvoiceId = null;
    let paymentId1 = null;
    let paymentId2 = null;

    // --- TEST 1: Invoice creation succeeds for COMPLETED Job Card ---
    await test('Invoice creation succeeds for COMPLETED Job Card', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          jobCardId: completedJobCard._id.toString(),
          items: [
            {
              itemType: 'SERVICE',
              description: 'Full Engine Periodic Service',
              quantity: 1,
              unitPrice: 2000
            },
            {
              itemType: 'PART',
              description: 'Synthetic Engine Oil 5W-30',
              quantity: 3.5,
              unitPrice: 400
            }
          ],
          discountAmount: 200,
          taxRate: 18,
          notes: 'Standard 40K service invoice'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(json)}`);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.invoiceNumber.startsWith('INV-'));
      assert.strictEqual(json.data.invoiceStatus, 'DRAFT');
      assert.strictEqual(json.data.paymentStatus, 'UNPAID');

      // Verify calculation:
      // Subtotal = 2000 + 1400 = 3400. Discount = 200. Taxable = 3200. Tax (18%) = 576. Grand Total = 3776
      assert.strictEqual(json.data.subtotal, 3400);
      assert.strictEqual(json.data.discountAmount, 200);
      assert.strictEqual(json.data.taxAmount, 576);
      assert.strictEqual(json.data.grandTotal, 3776);
      assert.strictEqual(json.data.balanceDue, 3776);
      assert.strictEqual(json.data.amountPaid, 0);

      draftInvoiceId = json.data._id;
      draftInvoiceNumber = json.data.invoiceNumber;
    });

    // --- TEST 2: Invoice creation rejected for non-COMPLETED Job Card without OWNER exception ---
    await test('Invoice creation rejected for non-COMPLETED Job Card without OWNER exception', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({
          jobCardId: inProgressJobCard._id.toString(),
          items: [{ description: 'Brake Inspection', quantity: 1, unitPrice: 500 }]
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      assert.strictEqual(json.error?.code || json.code, 'JOB_CARD_NOT_COMPLETED');
    });

    // --- TEST 3: Invoice creation succeeds for non-COMPLETED Job Card with valid OWNER exception ---
    await test('Invoice creation succeeds for non-COMPLETED Job Card with valid OWNER exception', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          jobCardId: inProgressJobCard._id.toString(),
          items: [{ description: 'Advance Part Procurement', quantity: 1, unitPrice: 1500 }],
          ownerExceptionReason: 'Customer requested advance pro-forma invoice before vehicle release'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(json.success, true);
    });

    // --- TEST 4: Duplicate invoice creation rejected (409) for same Job Card ---
    await test('Duplicate active invoice creation rejected (409) for same Job Card', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          jobCardId: completedJobCard._id.toString(),
          items: [{ description: 'Duplicate Test', quantity: 1, unitPrice: 1000 }]
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.strictEqual(json.error?.code || json.code, 'ACTIVE_INVOICE_EXISTS');
    });

    // --- TEST 5: Backend calculates invoice totals correctly and overrides client tampering ---
    await test('Backend calculates invoice totals correctly and overrides client tampering', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${draftInvoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          // Attacking client sends tampered subtotal and grandTotal
          subtotal: 10,
          grandTotal: 10,
          balanceDue: 10,
          items: [
            {
              itemType: 'SERVICE',
              description: 'Transmission Fluid Flush',
              quantity: 2,
              unitPrice: 1000
            }
          ],
          discountAmount: 100,
          taxRate: 18
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      // 2 * 1000 = 2000 subtotal, 100 discount = 1900 taxable, 18% tax = 342
      // Grand total = 2242 (client 10 was completely ignored)
      assert.strictEqual(json.data.subtotal, 2000);
      assert.strictEqual(json.data.discountAmount, 100);
      assert.strictEqual(json.data.taxAmount, 342);
      assert.strictEqual(json.data.grandTotal, 2242);
      assert.strictEqual(json.data.balanceDue, 2242);
    });

    // --- TEST 6: Invalid quantity (<= 0) rejected (400) ---
    await test('Invalid quantity (<= 0) rejected (400)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${draftInvoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          items: [{ description: 'Bad Item', quantity: 0, unitPrice: 500 }]
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.error?.code || json.code, 'INVALID_LINE_ITEM');
    });

    // --- TEST 7: Negative price rejected (400) ---
    await test('Negative price rejected (400)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${draftInvoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          items: [{ description: 'Negative Item', quantity: 1, unitPrice: -250 }]
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.error?.code || json.code, 'INVALID_LINE_ITEM');
    });

    // --- TEST 8: Draft to Issued status transition creates DEBIT entry in customer ledger ---
    await test('Draft to Issued status transition creates DEBIT entry in customer ledger', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${draftInvoiceId}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        }
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(json.data.invoiceStatus, 'ISSUED');
      assert.ok(json.data.issuedAt);

      issuedInvoiceId = draftInvoiceId;

      // Verify that a DEBIT entry was recorded in CustomerLedgerEntry
      const ledgerEntry = await CustomerLedgerEntry.findOne({
        sourceId: issuedInvoiceId,
        entryType: 'INVOICE_ISSUED'
      });
      assert.ok(ledgerEntry, 'Ledger entry for issued invoice must exist');
      assert.strictEqual(ledgerEntry.direction, 'DEBIT');
      assert.strictEqual(ledgerEntry.amount, 2242);
      assert.strictEqual(ledgerEntry.customerId.toString(), testCustomer._id.toString());
      assert.strictEqual(ledgerEntry.referenceNumber, draftInvoiceNumber);
    });

    // --- TEST 9: Issued invoice cannot be edited via PATCH /invoices/:id (400) ---
    await test('Issued invoice cannot be edited via PATCH /invoices/:id (400)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          notes: 'Attempting to edit issued invoice'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.error?.code || json.code, 'CANNOT_EDIT_ISSUED_INVOICE');
    });

    // --- TEST 10: Partial payment recording transitions invoice to PARTIALLY_PAID and creates CREDIT entry ---
    await test('Partial payment recording transitions invoice to PARTIALLY_PAID and creates CREDIT entry', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({
          amount: 1000,
          paymentMethod: 'UPI',
          transactionReference: 'UPI-TEST-123456',
          notes: 'Initial partial payment by UPI'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(json.data.invoice.paymentStatus, 'PARTIALLY_PAID');
      assert.strictEqual(json.data.invoice.amountPaid, 1000);
      assert.strictEqual(json.data.invoice.balanceDue, 1242); // 2242 - 1000

      paymentId1 = json.data.payment._id;

      // Verify ledger CREDIT entry
      const creditEntry = await CustomerLedgerEntry.findOne({
        sourceId: paymentId1,
        entryType: 'PAYMENT_RECEIVED'
      });
      assert.ok(creditEntry, 'Ledger entry for payment received must exist');
      assert.strictEqual(creditEntry.direction, 'CREDIT');
      assert.strictEqual(creditEntry.amount, 1000);
    });

    // --- TEST 11: Overpayment attempt (amount > balanceDue) rejected (400) ---
    await test('Overpayment attempt (amount > balanceDue) rejected (400)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({
          amount: 1500, // Balance is 1242
          paymentMethod: 'CASH'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.ok(['OVERPAYMENT_REJECTED', 'AMOUNT_EXCEEDS_BALANCE'].includes(json.error?.code || json.code));
    });

    // --- TEST 12: SUPER_ADMIN cannot reverse payment (403) ---
    await test('SUPER_ADMIN cannot reverse payment (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/payments/${paymentId1}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({
          reversalReason: 'Super admin unauthorized reversal test'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
    });

    // --- TEST 13: OWNER payment reversal restores balanceDue and creates DEBIT entry ---
    await test('OWNER payment reversal restores balanceDue and creates DEBIT entry', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/payments/${paymentId1}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          reversalReason: 'Wrong UPI transaction ID provided by customer'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(json.data.invoice.paymentStatus, 'UNPAID');
      assert.strictEqual(json.data.invoice.amountPaid, 0);
      assert.strictEqual(json.data.invoice.balanceDue, 2242);

      // Verify ledger DEBIT entry for reversal
      const reversalEntry = await CustomerLedgerEntry.findOne({
        sourceId: paymentId1,
        entryType: 'PAYMENT_REVERSED'
      });
      assert.ok(reversalEntry, 'Ledger entry for payment reversal must exist');
      assert.strictEqual(reversalEntry.direction, 'DEBIT');
      assert.strictEqual(reversalEntry.amount, 1000);
    });

    // --- TEST 14: Full payment transitions invoice to PAID ---
    await test('Full payment transitions invoice to PAID', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({
          amount: 2242,
          paymentMethod: 'CASH',
          notes: 'Full settlement in cash'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(json.data.invoice.paymentStatus, 'PAID');
      assert.strictEqual(json.data.invoice.balanceDue, 0);
      assert.strictEqual(json.data.invoice.amountPaid, 2242);
      paymentId2 = json.data.payment._id;
    });

    // --- TEST 15: Customer ledger summary netBalanceDue is 0 after full payment ---
    await test('Customer ledger summary netBalanceDue is 0 after full payment', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/customers/${testCustomer._id}/ledger-summary`, {
        headers: {
          'Cookie': cookieHeader(superSession.cookies)
        }
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      // Debits: 2242 (invoice) + 1000 (payment reversal) = 3242
      // Credits: 1000 (payment 1) + 2242 (full payment) = 3242
      // Net: 0
      assert.strictEqual(json.data.netBalanceDue, 0);
      assert.strictEqual(json.data.status, 'CLEARED');
    });

    // --- TEST 16: SUPER_ADMIN cannot cancel invoice (403) ---
    await test('SUPER_ADMIN cannot cancel invoice (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({ cancellationReason: 'Unauthorized test' })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
    });

    // --- TEST 17: OWNER can cancel invoice, adjusting ledger and updating JobCard ---
    await test('OWNER can cancel invoice, adjusting ledger and updating JobCard', async () => {
      // 17a: Cancelling while payments exist is rejected (400)
      const rejectRes = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({ cancellationReason: 'Premature cancellation attempt' })
      });
      assert.strictEqual(rejectRes.status, 400);

      // 17b: Reverse payment prior to cancellation
      const revRes = await fetch(`${BASE_URL}/api/v1/payments/${paymentId2}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({ reversalReason: 'Reversing prior to invoice cancellation' })
      });
      assert.strictEqual(revRes.status, 200);

      // 17c: Now cancel invoice successfully
      const res = await fetch(`${BASE_URL}/api/v1/invoices/${issuedInvoiceId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({ cancellationReason: 'Job Card disputed and rebuilt' })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(json.data.invoiceStatus, 'CANCELLED');

      // Verify JobCard cleared invoice link
      const updatedJobCard = await JobCard.findById(completedJobCard._id);
      assert.strictEqual(updatedJobCard.invoiceId, null);
    });

    // --- TEST 18: SUPER_ADMIN cannot record manual ledger adjustments (403) ---
    await test('SUPER_ADMIN cannot record manual ledger adjustments (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/customers/${testCustomer._id}/ledger-adjustment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(superSession.cookies),
          'x-csrf-token': superSession.csrfToken
        },
        body: JSON.stringify({
          direction: 'CREDIT',
          amount: 500,
          description: 'Staff unauthorized discount'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
    });

    // --- TEST 19: OWNER records manual opening balance / adjustment successfully ---
    await test('OWNER records manual opening balance / adjustment successfully', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/customers/${testCustomer._id}/ledger-adjustment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          direction: 'DEBIT',
          amount: 1500,
          description: 'Historical register opening balance from 2025'
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(json.data.entry?.direction || json.data.direction, 'DEBIT');
      assert.strictEqual(json.data.entry?.amount || json.data.amount, 1500);

      // Verify customer ledger net balance now reflects the debit
      const ledgerRes = await fetch(`${BASE_URL}/api/v1/customers/${testCustomer._id}/ledger`, {
        headers: { 'Cookie': cookieHeader(superSession.cookies) }
      });
      const ledgerJson = await ledgerRes.json();
      assert.strictEqual(ledgerJson.data.summary.netBalanceDue, 1500);
    });

    // --- TEST 20: Outstanding dues endpoint calculates customer aging accurately ---
    await test('Outstanding dues endpoint calculates customer aging accurately', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/reports/outstanding-dues`, {
        headers: { 'Cookie': cookieHeader(ownerSession.cookies) }
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.ok(Array.isArray(json.data.customers));

      const customerDue = json.data.customers.find((c) => c.customerId && c.customerId.toString() === testCustomer._id.toString());
      assert.ok(customerDue, 'Test customer must appear in outstanding dues');
      assert.strictEqual(customerDue.outstandingAmount, 1500);
      assert.strictEqual(typeof customerDue.daysOutstanding, 'number');
      assert.ok(json.data.summary.totalOutstanding >= 1500);
    });

    // --- TEST 21: Financial dashboard stats endpoint returns monthly KPIs ---
    await test('Financial dashboard stats endpoint returns monthly KPIs', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/reports/billing-stats`, {
        headers: { 'Cookie': cookieHeader(ownerSession.cookies) }
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(typeof json.data.totalInvoicedThisMonth, 'number');
      assert.strictEqual(typeof json.data.totalPaymentsThisMonth, 'number');
      assert.strictEqual(typeof json.data.totalOutstandingDues, 'number');
      assert.strictEqual(typeof json.data.unpaidInvoicesCount, 'number');
    });

    // --- TEST 22: Unauthenticated access to billing APIs rejected (401) ---
    await test('Unauthenticated access to billing APIs rejected (401)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices`);
      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.error?.code || json.code, 'UNAUTHENTICATED');
    });

    // --- TEST 23: CSRF token required for billing mutation endpoints (403) ---
    await test('CSRF token required for billing mutation endpoints (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies)
          // Missing x-csrf-token
        },
        body: JSON.stringify({
          jobCardId: completedJobCard._id.toString(),
          items: [{ description: 'CSRF Attack', quantity: 1, unitPrice: 100 }]
        })
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.ok(['CSRF_MISSING', 'CSRF_INVALID'].includes(json.error?.code || json.code));
    });

    // --- TEST 24: Historical customer and vehicle snapshots are preserved in invoice ---
    await test('Historical customer and vehicle snapshots are preserved in invoice', async () => {
      const invoice = await Invoice.findById(issuedInvoiceId);
      assert.strictEqual(invoice.customerSnapshot.fullName, testCustomer.fullName);
      assert.strictEqual(invoice.customerSnapshot.mobileNumber, testCustomer.mobileNumber);
      assert.strictEqual(invoice.vehicleSnapshot.brand, testVehicle.brand);
      assert.strictEqual(invoice.vehicleSnapshot.registrationNumber, testVehicle.registrationNumberDisplay);
    });

    // --- TEST 25: Regression test - Phase 1 Public Site & Enquiries ---
    await test('Regression: Phase 1 Public site services and health check', async () => {
      const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
      assert.strictEqual(healthRes.status, 200);

      const servicesRes = await fetch(`${BASE_URL}/api/v1/services`);
      assert.strictEqual(servicesRes.status, 200);
    });

    // --- TEST 26: Regression test - Phase 2 Customer Appointment Creation ---
    await test('Regression: Phase 2 Customer appointment creation', async () => {
      const apptRes = await fetch(`${BASE_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID()
        },
        body: JSON.stringify({
          customerName: 'P7 Regression Tester',
          mobileNumber: '9812347002',
          registrationNumber: 'HR 11 P 7002',
          brand: 'Hyundai',
          model: 'Creta',
          fuelType: 'DIESEL',
          preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
          notes: 'General inspection'
        })
      });

      const apptJson = await apptRes.json();
      assert.strictEqual(apptRes.status, 201, `Expected 201: ${JSON.stringify(apptJson)}`);
      assert.strictEqual(apptJson.success, true);
    });

    // --- TEST 27: Regression test - Phase 5 Job Card Workflow & Status Transitions ---
    await test('Regression: Phase 5 Job Card workflow transitions', async () => {
      const jc = await JobCard.create({
        jobCardNumber: 'JC-20261031-7099',
        customerId: testCustomer._id,
        vehicleId: testVehicle._id,
        customerSnapshot: {
          fullName: testCustomer.fullName,
          mobileNumber: testCustomer.mobileNumber
        },
        vehicleSnapshot: {
          brand: testVehicle.brand,
          model: testVehicle.model,
          registrationNumber: testVehicle.registrationNumberDisplay
        },
        status: 'CREATED',
        fuelLevel: 'QUARTER',
        odometerReading: 12000,
        createdBy: ownerUser._id
      });

      const patchRes = await fetch(`${BASE_URL}/api/v1/job-cards/${jc._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({ status: 'INSPECTION', notes: 'Entering inspection bay' })
      });

      assert.strictEqual(patchRes.status, 200);
    });

    // --- TEST 28: Regression test - Phase 6 Service Estimate Creation & Calculation ---
    await test('Regression: Phase 6 Service Estimate creation & calculation', async () => {
      const estRes = await fetch(`${BASE_URL}/api/v1/job-cards/${inProgressJobCard._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader(ownerSession.cookies),
          'x-csrf-token': ownerSession.csrfToken
        },
        body: JSON.stringify({
          taxRate: 18,
          items: [
            { itemType: 'PART', itemName: 'Front Brake Pads Set', quantity: 1, unitPrice: 1800 }
          ]
        })
      });

      const estJson = await estRes.json();
      assert.strictEqual(estRes.status, 201);
      assert.strictEqual(estJson.data.subtotal, 1800);
      assert.strictEqual(estJson.data.taxAmount, 324);
      assert.strictEqual(estJson.data.grandTotal, 2124);
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
  } finally {
    // Teardown
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    // Cleanup created test records
    try {
      await User.deleteMany({ email: { $in: ['p7owner@test.com', 'p7super@test.com'] } });
      await Customer.deleteMany({ mobileNumber: { $in: ['9812347001', '9812347002'] } });
      await Vehicle.deleteMany({ registrationNumberClean: { $in: ['HR11P701', 'HR11P702'] } });
      await JobCard.deleteMany({ jobCardNumber: { $in: ['JC-20261031-7001', 'JC-20261031-7002', 'JC-20261031-7099'] } });
    } catch (e) {
      // Ignore cleanup error
    }
    await disconnectDB();
  }
}

runPhase7Tests().catch((err) => {
  console.error('\n Phase 7 Test Suite Failed:', err);
  process.exit(1);
});
