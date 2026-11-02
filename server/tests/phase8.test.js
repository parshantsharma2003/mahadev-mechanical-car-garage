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

const TEST_PORT = 5092;
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

async function runPhase8Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 8 TEST SUITE            ');
  console.log('  EXPENSES, SUPPLIERS, PURCHASES & SUPPLIER KHATTA    ');
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

    await User.deleteMany({ email: { $in: ['p8owner@test.com', 'p8super@test.com'] } });
    await Customer.deleteMany({ mobileNumber: { $in: ['9812348001', '9812348002'] } });
    await Vehicle.deleteMany({ registrationNumberClean: { $in: ['MH12P801', 'MH12P802'] } });
    await Supplier.deleteMany({ mobileNumber: { $in: ['9800088001', '9800088002', '9800088003', '9800088004'] } });

    const ownerUser = await User.create({
      fullName: 'Phase 8 Owner',
      email: 'p8owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      isActive: true
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 8 SuperAdmin',
      email: 'p8super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      isActive: true
    });

    // 1. Authenticate OWNER
    const ownerLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
      body: JSON.stringify({ email: 'p8owner@test.com', password: 'TestPass123!' })
    });
    assert.strictEqual(ownerLoginRes.status, 200, 'Owner login failed');
    const ownerCookies = extractCookies(ownerLoginRes);
    const ownerJson = await ownerLoginRes.json();
    const ownerCsrf = ownerJson.data?.csrfToken;

    // 2. Authenticate SUPER_ADMIN
    const superLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
      body: JSON.stringify({ email: 'p8super@test.com', password: 'TestPass123!' })
    });
    assert.strictEqual(superLoginRes.status, 200, 'SuperAdmin login failed');
    const superCookies = extractCookies(superLoginRes);
    const superJson = await superLoginRes.json();
    const superCsrf = superJson.data?.csrfToken;

    let createdExpenseId = null;
    let createdSupplierId = null;
    let createdPurchaseId = null;
    let createdPaymentId = null;

    // ==========================================
    // MODULE A: EXPENSE MANAGEMENT TESTS
    // ==========================================

    await test('Expense creation succeeds with valid data (201 Created)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          category: 'ELECTRICITY',
          title: 'Monthly Workshop Power Bill',
          amount: 4500.5,
          paymentMethod: 'UPI',
          vendorName: 'MSEDCL',
          receiptReference: 'EB-2026-OCT',
          notes: 'Main meter bill'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.expenseNumber.startsWith('EXP-'));
      assert.strictEqual(json.data.amount, 4500.5);
      assert.strictEqual(json.data.status, 'RECORDED');
      createdExpenseId = json.data._id;
    });

    await test('Expense creation rejected for amount <= 0 (400)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          category: 'TEA_FOOD',
          title: 'Morning staff tea',
          amount: 0,
          paymentMethod: 'CASH'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'INVALID_AMOUNT');
    });

    await test('Expense creation rejected for invalid category (400)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          category: 'CRYPTO_TRADING',
          title: 'Speculative overhead',
          amount: 1000,
          paymentMethod: 'CASH'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'INVALID_CATEGORY');
    });

    await test('SUPER_ADMIN cannot reverse expense (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses/${createdExpenseId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrf
        },
        body: JSON.stringify({ reversalReason: 'Unauthorized test reversal' })
      });

      assert.strictEqual(res.status, 403);
    });

    await test('OWNER can reverse expense with reason (200 OK)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses/${createdExpenseId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({ reversalReason: 'Double payment returned by electricity board' })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.status, 'REVERSED');
      assert.strictEqual(json.data.reversalReason, 'Double payment returned by electricity board');
    });

    await test('Duplicate expense reversal is rejected (400 ALREADY_REVERSED)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses/${createdExpenseId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({ reversalReason: 'Attempt second reversal' })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'ALREADY_REVERSED');
    });

    await test('AuditLog entries exist for expense creation and reversal', async () => {
      const createLog = await AuditLog.findOne({
        action: 'EXPENSE_CREATED',
        entityId: createdExpenseId
      });
      assert.ok(createLog, 'EXPENSE_CREATED audit log missing');

      const reverseLog = await AuditLog.findOne({
        action: 'EXPENSE_REVERSED',
        entityId: createdExpenseId
      });
      assert.ok(reverseLog, 'EXPENSE_REVERSED audit log missing');
      assert.strictEqual(reverseLog.actorRole, 'OWNER');
    });

    // ==========================================
    // MODULE B: SUPPLIER MANAGEMENT TESTS
    // ==========================================

    await test('Create supplier with unique sequential code SUP-XXXX (201 Created)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          businessName: 'Mahindra Genuine Parts Hub',
          contactPerson: 'Kailash Shinde',
          mobileNumber: '9800088001',
          supplierCategory: 'SPARE_PARTS',
          city: 'Pune',
          notes: 'Primary OEM parts distributor'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.supplierCode.startsWith('SUP-'));
      assert.strictEqual(json.data.isActive, true);
      createdSupplierId = json.data._id;
    });

    await test('Duplicate supplier registration rejected (409 DUPLICATE_SUPPLIER)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          businessName: 'Mahindra Genuine Parts Hub',
          contactPerson: 'Other person',
          mobileNumber: '9800088001'
        })
      });

      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'DUPLICATE_SUPPLIER');
    });

    await test('Supplier details update succeeds (PATCH /suppliers/:id)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrf
        },
        body: JSON.stringify({
          contactPerson: 'Kailash G. Shinde',
          notes: 'Preferred supplier - 15 days credit'
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.contactPerson, 'Kailash G. Shinde');
    });

    await test('Supplier deactivation and reactivation (PATCH /suppliers/:id/status)', async () => {
      // Deactivate
      const deactRes = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/status`, {
        method: 'PATCH',
        headers: {
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        }
      });
      assert.strictEqual(deactRes.status, 200);
      let json = await deactRes.json();
      assert.strictEqual(json.data.isActive, false);

      // Reactivate
      const reactRes = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/status`, {
        method: 'PATCH',
        headers: {
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        }
      });
      assert.strictEqual(reactRes.status, 200);
      json = await reactRes.json();
      assert.strictEqual(json.data.isActive, true);
    });

    await test('Supplier opening balance creates initial DEBIT ledger entry (OPENING_PAYABLE)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          businessName: 'Castrol Lubricants Agency',
          contactPerson: 'Vikas Rao',
          mobileNumber: '9800088002',
          supplierCategory: 'ENGINE_OIL',
          openingBalance: 12500,
          openingBalanceDirection: 'OPENING_PAYABLE'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      const supId = json.data._id;

      // Verify SupplierLedgerEntry
      const entry = await SupplierLedgerEntry.findOne({
        supplierId: supId,
        entryType: 'OPENING_BALANCE'
      });
      assert.ok(entry, 'Opening balance ledger entry missing');
      assert.strictEqual(entry.direction, 'DEBIT');
      assert.strictEqual(entry.amount, 12500);
    });

    await test('Supplier opening balance creates initial CREDIT ledger entry (OPENING_CREDIT)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          businessName: 'Exide Battery Distributors',
          contactPerson: 'Sunil Deshmukh',
          mobileNumber: '9800088003',
          supplierCategory: 'BATTERY',
          openingBalance: 3000,
          openingBalanceDirection: 'OPENING_CREDIT'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      const supId = json.data._id;

      const entry = await SupplierLedgerEntry.findOne({
        supplierId: supId,
        entryType: 'OPENING_BALANCE'
      });
      assert.ok(entry, 'Opening balance ledger entry missing');
      assert.strictEqual(entry.direction, 'CREDIT');
      assert.strictEqual(entry.amount, 3000);
    });

    // ==========================================
    // MODULE C: SUPPLIER PURCHASES TESTS
    // ==========================================

    await test('Create supplier purchase with multiple items and backend total calculation', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          supplierId: createdSupplierId,
          supplierInvoiceNumber: 'BILL-OCT-9901',
          items: [
            { itemName: 'Scorpio-N Oil Filter', quantity: 5, unitPrice: 400, category: 'SPARE_PARTS' },
            { itemName: 'Front Brake Pad Set', quantity: 2, unitPrice: 2200, category: 'SPARE_PARTS' }
          ],
          discountAmount: 400,
          taxAmount: 500, // (2000 + 4400) - 400 = 6000 + 500 = 6500
          amountPaid: 0
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.purchaseNumber.startsWith('PUR-'));
      assert.strictEqual(json.data.subtotal, 6400);
      assert.strictEqual(json.data.grandTotal, 6500);
      assert.strictEqual(json.data.amountPaid, 0);
      assert.strictEqual(json.data.balanceDue, 6500);
      assert.strictEqual(json.data.paymentStatus, 'UNPAID');

      createdPurchaseId = json.data._id;

      // Verify SupplierLedgerEntry was created with DEBIT
      const ledger = await SupplierLedgerEntry.findOne({
        sourceId: createdPurchaseId,
        entryType: 'PURCHASE'
      });
      assert.ok(ledger, 'Purchase DEBIT ledger entry missing');
      assert.strictEqual(ledger.direction, 'DEBIT');
      assert.strictEqual(ledger.amount, 6500);
    });

    await test('Backend purchase calculation overrides client tampering', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          supplierId: createdSupplierId,
          items: [
            { itemName: 'Air Filter', quantity: 2, unitPrice: 500 }
          ],
          grandTotal: 10 // Tampered client grandTotal
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.grandTotal, 1000, 'Client tampering was not overridden by server calculations');
    });

    await test('Purchase with immediate initial partial payment', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          supplierId: createdSupplierId,
          supplierInvoiceNumber: 'BILL-OCT-9902',
          items: [
            { itemName: 'Clutch Plate Set', quantity: 1, unitPrice: 8000 }
          ],
          amountPaid: 3000,
          paymentMethod: 'UPI',
          transactionReference: 'UPI-TXN-110293'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.data.grandTotal, 8000);
      assert.strictEqual(json.data.amountPaid, 3000);
      assert.strictEqual(json.data.balanceDue, 5000);
      assert.strictEqual(json.data.paymentStatus, 'PARTIALLY_PAID');

      // Check Payment record
      const pmt = await SupplierPayment.findOne({ purchaseId: json.data._id });
      assert.ok(pmt, 'Immediate payment record missing');
      assert.strictEqual(pmt.amount, 3000);

      // Check CREDIT ledger entry
      const credit = await SupplierLedgerEntry.findOne({
        sourceId: pmt._id,
        entryType: 'PAYMENT'
      });
      assert.ok(credit, 'Immediate payment CREDIT ledger entry missing');
      assert.strictEqual(credit.direction, 'CREDIT');
      assert.strictEqual(credit.amount, 3000);
    });

    await test('Duplicate supplier invoice number rejected for same supplier (409)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          supplierId: createdSupplierId,
          supplierInvoiceNumber: 'BILL-OCT-9901', // Already exists
          items: [{ itemName: 'Gasket', quantity: 1, unitPrice: 200 }]
        })
      });

      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'DUPLICATE_SUPPLIER_INVOICE');
    });

    // ==========================================
    // MODULE D: SUPPLIER PAYMENTS TESTS
    // ==========================================

    await test('Record supplier payment against unpaid purchase (201 Created)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrf
        },
        body: JSON.stringify({
          purchaseId: createdPurchaseId,
          amount: 2500,
          paymentMethod: 'BANK_TRANSFER',
          transactionReference: 'NEFT-MAH-9921',
          notes: 'First installment'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.paymentReference.startsWith('SPAY-'));
      assert.strictEqual(json.data.amount, 2500);
      createdPaymentId = json.data._id;

      // Verify purchase balance was reduced from 6500 to 4000
      const updatedPurchase = await SupplierPurchase.findById(createdPurchaseId);
      assert.strictEqual(updatedPurchase.amountPaid, 2500);
      assert.strictEqual(updatedPurchase.balanceDue, 4000);
      assert.strictEqual(updatedPurchase.paymentStatus, 'PARTIALLY_PAID');

      // Verify CREDIT ledger entry
      const creditEntry = await SupplierLedgerEntry.findOne({
        sourceId: createdPaymentId,
        entryType: 'PAYMENT'
      });
      assert.ok(creditEntry, 'Payment CREDIT ledger entry missing');
      assert.strictEqual(creditEntry.direction, 'CREDIT');
      assert.strictEqual(creditEntry.amount, 2500);
    });

    await test('Overpayment against purchase rejected (400 EXCEEDS_BALANCE_DUE)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          purchaseId: createdPurchaseId,
          amount: 50000 // Remaining due is only 4000
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'EXCEEDS_BALANCE_DUE');
    });

    await test('SUPER_ADMIN cannot reverse supplier payment (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-payments/${createdPaymentId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrf
        },
        body: JSON.stringify({ reversalReason: 'Unauthorized reversal attempt' })
      });

      assert.strictEqual(res.status, 403);
    });

    await test('OWNER payment reversal restores purchase balance and posts DEBIT entry', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-payments/${createdPaymentId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({ reversalReason: 'Cheque bounced / transaction failed at bank' })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.status, 'REVERSED');

      // Purchase balance should be restored back to 6500
      const restoredPurchase = await SupplierPurchase.findById(createdPurchaseId);
      assert.strictEqual(restoredPurchase.amountPaid, 0);
      assert.strictEqual(restoredPurchase.balanceDue, 6500);
      assert.strictEqual(restoredPurchase.paymentStatus, 'UNPAID');

      // Compensating DEBIT entry in supplier ledger
      const debitEntry = await SupplierLedgerEntry.findOne({
        sourceId: createdPaymentId,
        entryType: 'PAYMENT_REVERSAL'
      });
      assert.ok(debitEntry, 'Compensating DEBIT ledger entry missing');
      assert.strictEqual(debitEntry.direction, 'DEBIT');
      assert.strictEqual(debitEntry.amount, 2500);
    });

    await test('Purchase cancellation rejected if active completed payments exist', async () => {
      // Record a fresh completed payment of 1000
      const payRes = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          purchaseId: createdPurchaseId,
          amount: 1000,
          paymentMethod: 'CASH'
        })
      });
      assert.strictEqual(payRes.status, 201);
      const payJson = await payRes.json();
      const newPayId = payJson.data._id;

      // Attempt to cancel purchase without reversing payment
      const cancelRes = await fetch(`${BASE_URL}/api/v1/supplier-purchases/${createdPurchaseId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({ cancellationReason: 'Defective parts returned' })
      });

      assert.strictEqual(cancelRes.status, 400);
      const cancelJson = await cancelRes.json();
      assert.strictEqual(cancelJson.error?.code, 'PAYMENTS_EXIST');

      // Now reverse the payment
      const revRes = await fetch(`${BASE_URL}/api/v1/supplier-payments/${newPayId}/reverse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({ reversalReason: 'Returned for cancellation' })
      });
      assert.strictEqual(revRes.status, 200);
    });

    await test('SUPER_ADMIN cannot cancel purchase (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-purchases/${createdPurchaseId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrf
        },
        body: JSON.stringify({ cancellationReason: 'Super admin cancel attempt' })
      });

      assert.strictEqual(res.status, 403);
    });

    await test('OWNER can cancel purchase and creates compensating CREDIT ledger entry', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/supplier-purchases/${createdPurchaseId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({ cancellationReason: 'Returned defective lot to vendor' })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.purchaseStatus, 'CANCELLED');

      // Check compensating CREDIT entry
      const cancelCredit = await SupplierLedgerEntry.findOne({
        sourceId: createdPurchaseId,
        entryType: 'PURCHASE_REVERSAL'
      });
      assert.ok(cancelCredit, 'PURCHASE_REVERSAL credit entry missing');
      assert.strictEqual(cancelCredit.direction, 'CREDIT');
      assert.strictEqual(cancelCredit.amount, 6500);
    });

    // ==========================================
    // MODULE E: DIGITAL SUPPLIER KHATTA & RECONCILIATION
    // ==========================================

    await test('SUPER_ADMIN cannot record manual ledger adjustments (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/ledger/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(superCookies),
          'X-CSRF-Token': superCsrf
        },
        body: JSON.stringify({
          amount: 500,
          direction: 'CREDIT',
          reason: 'Unauthorized discount'
        })
      });

      assert.strictEqual(res.status, 403);
    });

    await test('OWNER records manual supplier ledger adjustment successfully (201 Created)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/ledger/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          amount: 750,
          direction: 'CREDIT',
          reason: 'Annual loyalty discount voucher agreed by supplier'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.entry.direction, 'CREDIT');
      assert.strictEqual(json.data.entry.amount, 750);
    });

    await test('Supplier ledger statement calculates running balance accurately', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/suppliers/${createdSupplierId}/ledger`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.entries));
      assert.ok(json.data.entries.length >= 4);

      // Verify running balance is computed on every entry
      json.data.entries.forEach((e) => {
        assert.ok(typeof e.runningBalance === 'number');
      });

      assert.ok(typeof json.data.summary.totalDebit === 'number');
      assert.ok(typeof json.data.summary.totalCredit === 'number');
      assert.strictEqual(
        json.data.summary.netBalanceDue,
        Math.round((json.data.summary.totalDebit - json.data.summary.totalCredit) * 100) / 100
      );
    });

    await test('Unauthenticated access to expense & supplier APIs rejected (401)', async () => {
      const expRes = await fetch(`${BASE_URL}/api/v1/expenses`);
      assert.strictEqual(expRes.status, 401);

      const supRes = await fetch(`${BASE_URL}/api/v1/suppliers`);
      assert.strictEqual(supRes.status, 401);

      const purRes = await fetch(`${BASE_URL}/api/v1/supplier-purchases`);
      assert.strictEqual(purRes.status, 401);
    });

    await test('CSRF token required for mutation endpoints (403)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies)
          // Missing X-CSRF-Token
        },
        body: JSON.stringify({
          category: 'CLEANING',
          title: 'Shop floor soap',
          amount: 150
        })
      });

      assert.strictEqual(res.status, 403);
    });

    // ==========================================
    // REGRESSION TESTS (Phases 1 - 7)
    // ==========================================

    await test('Regression: Phase 1 Public site services and health check', async () => {
      const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
      assert.strictEqual(healthRes.status, 200);
      const healthJson = await healthRes.json();
      assert.strictEqual(healthJson.status, 'healthy');

      const srvRes = await fetch(`${BASE_URL}/api/v1/services`);
      assert.strictEqual(srvRes.status, 200);
      const srvJson = await srvRes.json();
      assert.ok(Array.isArray(srvJson.data?.services || srvJson.data));
    });

    await test('Regression: Phase 2 Customer appointment creation', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const res = await fetch(`${BASE_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID()
        },
        body: JSON.stringify({
          customerName: 'P8 Regression Client',
          mobileNumber: '9812348001',
          email: 'p8reg@test.com',
          preferredDate: dateStr,
          preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
          registrationNumber: 'MH 12 P 8001',
          brand: 'Mahindra',
          model: 'Scorpio-N',
          fuelType: 'DIESEL',
          notes: 'Phase 8 regression check'
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.bookingReference || json.data._id);
    });

    let regressionJobCardId = null;

    await test('Regression: Phase 5 & 6 Job Card and Service Estimate calculations', async () => {
      const cust = await Customer.findOne({ mobileNumber: '9812348001' });
      const veh = await Vehicle.findOne({ registrationNumberClean: /^MH12P8/ });

      const jc = await JobCard.create({
        jobCardNumber: `JC-20261102-${Date.now().toString().slice(-4)}`,
        customerId: cust._id,
        vehicleId: veh._id,
        serviceType: 'MAJOR_SERVICE',
        status: 'WAITING_FOR_APPROVAL',
        customerSnapshot: { fullName: cust.fullName, mobileNumber: cust.mobileNumber },
        vehicleSnapshot: { brand: veh.brand, model: veh.model, registrationNumber: veh.registrationNumber },
        createdBy: ownerUser._id
      });
      regressionJobCardId = jc._id;

      const estRes = await fetch(`${BASE_URL}/api/v1/job-cards/${jc._id}/estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          taxRate: 18,
          items: [
            { itemType: 'LABOUR', itemName: 'Engine Tuning', quantity: 1, unitPrice: 1500 },
            { itemType: 'PART', itemName: 'Synthetic Oil 6L', quantity: 1, unitPrice: 3200 }
          ]
        })
      });

      const estJson = await estRes.json();
      assert.strictEqual(estRes.status, 201, `Estimate failed: ${JSON.stringify(estJson)}`);
      assert.strictEqual(estJson.data.subtotal, 4700);
      assert.strictEqual(estJson.data.taxAmount, 846);
      assert.strictEqual(estJson.data.grandTotal, 5546);
    });

    await test('Regression: Phase 7 Billing Invoices & Customer Ledger', async () => {
      const invRes = await fetch(`${BASE_URL}/api/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(ownerCookies),
          'X-CSRF-Token': ownerCsrf
        },
        body: JSON.stringify({
          jobCardId: regressionJobCardId,
          items: [
            { itemType: 'SERVICE', itemName: 'Brake Inspection', quantity: 1, unitPrice: 800 }
          ],
          discountAmount: 100,
          taxRate: 18,
          ownerExceptionReason: 'Phase 8 regression bill'
        })
      });

      const invJson = await invRes.json();
      assert.strictEqual(invRes.status, 201, `Invoice creation failed: ${JSON.stringify(invJson)}`);
      assert.strictEqual(invJson.data.subtotal, 800);
      assert.strictEqual(invJson.data.grandTotal, 826);
    });

    console.log('\n======================================================');
    console.log(` ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\nTest Suite Terminated with Errors.');
    process.exitCode = 1;
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await disconnectDB();
  }
}

runPhase8Tests();
