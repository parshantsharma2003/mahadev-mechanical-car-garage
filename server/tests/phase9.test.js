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
  Expense,
  Supplier,
  SupplierPurchase,
  SupplierPayment
} from '../src/models/index.js';

dotenv.config();

const TEST_PORT = 5093;
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

async function runPhase9Tests() {
  console.log('\n======================================================');
  console.log('       MAHADEV GARAGE - PHASE 9 TEST SUITE            ');
  console.log('   BUSINESS ANALYTICS, FINANCIALS & REPORTING         ');
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

    // Cleanup previous test fixtures
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);

    await User.deleteMany({ email: { $in: ['p9owner@test.com', 'p9super@test.com'] } });
    await Customer.deleteMany({ mobileNumber: { $in: ['9812349001', '9812349002'] } });
    await Vehicle.deleteMany({ registrationNumberClean: { $in: ['MH12P901', 'MH12P902'] } });
    await Supplier.deleteMany({ mobileNumber: { $in: ['9800099001', '9800099002'] } });
    await Invoice.deleteMany({});
    await Payment.deleteMany({});
    await Expense.deleteMany({});
    await SupplierPurchase.deleteMany({});
    await SupplierPayment.deleteMany({});
    await JobCard.deleteMany({});
    await Appointment.deleteMany({});

    // Seed test OWNER and SUPER_ADMIN
    const ownerUser = await User.create({
      fullName: 'Phase 9 Owner',
      email: 'p9owner@test.com',
      passwordHash: hash,
      role: 'OWNER',
      isActive: true
    });

    const superAdminUser = await User.create({
      fullName: 'Phase 9 SuperAdmin',
      email: 'p9super@test.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      isActive: true
    });

    // Login OWNER
    let ownerCookies = {};
    let ownerCsrf = '';
    const loginOwnerRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'p9owner@test.com', password: 'TestPass123!' })
    });
    assert.strictEqual(loginOwnerRes.status, 200, 'Owner login failed');
    ownerCookies = extractCookies(loginOwnerRes);
    const ownerBody = await loginOwnerRes.json();
    ownerCsrf = ownerBody.data?.csrfToken || ownerCookies['mahadev_csrf_token'];

    // Login SUPER_ADMIN
    let superCookies = {};
    let superCsrf = '';
    const loginSuperRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'p9super@test.com', password: 'TestPass123!' })
    });
    assert.strictEqual(loginSuperRes.status, 200, 'Super admin login failed');
    superCookies = extractCookies(loginSuperRes);
    const superBody = await loginSuperRes.json();
    superCsrf = superBody.data?.csrfToken || superCookies['mahadev_csrf_token'];

    // Setup base domain fixtures
    const customer = await Customer.create({
      fullName: 'Analytics Test Customer',
      mobileNumber: '9812349001',
      createdBy: ownerUser._id
    });

    const vehicle = await Vehicle.create({
      registrationNumber: 'MH 12 P9 0001',
      registrationNumberClean: 'MH12P901',
      customerId: customer._id,
      brand: 'Mahindra',
      model: 'Scorpio-N',
      fuelType: 'DIESEL',
      manufacturingYear: 2023,
      createdBy: ownerUser._id
    });

    const appt = await Appointment.create({
      bookingReference: `MMCG-APP-P9-${Date.now()}`,
      idempotencyKey: randomUUID(),
      customerId: customer._id,
      vehicleId: vehicle._id,
      customerSnapshot: {
        fullName: customer.fullName,
        mobileNumber: customer.mobileNumber
      },
      vehicleSnapshot: {
        brand: vehicle.brand,
        model: vehicle.model,
        registrationNumber: vehicle.registrationNumber
      },
      services: [
        { title: 'Periodic Maintenance', priceDisplay: '₹3,500' }
      ],
      preferredDate: new Date(),
      preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
      status: 'CONFIRMED'
    });

    const jobCard = await JobCard.create({
      jobCardNumber: `JC-P9-${Date.now()}`,
      appointmentId: appt._id,
      customerId: customer._id,
      vehicleId: vehicle._id,
      status: 'COMPLETED',
      assignedMechanic: 'Ramesh Mistri',
      serviceAdvisor: 'Sunil Sharma',
      intakeKmReading: 15400,
      customerSnapshot: { fullName: customer.fullName, mobileNumber: customer.mobileNumber },
      vehicleSnapshot: { registrationNumber: vehicle.registrationNumber, brand: 'Mahindra', model: 'Scorpio-N' },
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      completedAt: new Date(),
      createdBy: ownerUser._id
    });

    // Seed 1 ISSUED invoice (INR 5,000 with 3,000 paid, 2,000 balance)
    const issuedInvoice = await Invoice.create({
      invoiceNumber: `INV-P9-001`,
      jobCardId: jobCard._id,
      customerId: customer._id,
      vehicleId: vehicle._id,
      invoiceStatus: 'ISSUED',
      paymentStatus: 'PARTIALLY_PAID',
      issueDate: new Date(),
      subtotal: 5000,
      grandTotal: 5000,
      amountPaid: 3000,
      balanceDue: 2000,
      customerSnapshot: { fullName: customer.fullName, mobileNumber: customer.mobileNumber },
      vehicleSnapshot: { registrationNumber: vehicle.registrationNumber, brand: 'Mahindra', model: 'Scorpio-N' },
      jobCardSnapshot: { jobCardNumber: jobCard.jobCardNumber },
      items: [
        { itemType: 'LABOUR', itemName: 'Major Engine Service', unitPrice: 2000, quantity: 1, lineTotal: 2000 },
        { itemType: 'PART', itemName: 'Synthetic Engine Oil 5W30', unitPrice: 1500, quantity: 2, lineTotal: 3000 }
      ],
      createdBy: ownerUser._id
    });

    // Seed 1 DRAFT invoice (must be EXCLUDED from issued billed totals)
    const draftInvoice = await Invoice.create({
      invoiceNumber: `INV-P9-DRAFT`,
      jobCardId: jobCard._id,
      customerId: customer._id,
      vehicleId: vehicle._id,
      invoiceStatus: 'DRAFT',
      paymentStatus: 'UNPAID',
      issueDate: new Date(),
      subtotal: 12000,
      grandTotal: 12000,
      amountPaid: 0,
      balanceDue: 12000,
      customerSnapshot: { fullName: customer.fullName, mobileNumber: customer.mobileNumber },
      vehicleSnapshot: { registrationNumber: vehicle.registrationNumber, brand: 'Mahindra', model: 'Scorpio-N' },
      jobCardSnapshot: { jobCardNumber: jobCard.jobCardNumber },
      items: [
        { itemType: 'SERVICE', itemName: 'Full Body Paint', unitPrice: 12000, quantity: 1, lineTotal: 12000 }
      ],
      createdBy: ownerUser._id
    });

    // Seed 1 CANCELLED invoice (must be EXCLUDED from issued billed totals)
    const cancelledInvoice = await Invoice.create({
      invoiceNumber: `INV-P9-CANCELLED`,
      jobCardId: jobCard._id,
      customerId: customer._id,
      vehicleId: vehicle._id,
      invoiceStatus: 'CANCELLED',
      paymentStatus: 'UNPAID',
      issueDate: new Date(),
      subtotal: 8000,
      grandTotal: 8000,
      amountPaid: 0,
      balanceDue: 8000,
      cancellationReason: 'Duplicate invoice created in error',
      customerSnapshot: { fullName: customer.fullName, mobileNumber: customer.mobileNumber },
      vehicleSnapshot: { registrationNumber: vehicle.registrationNumber, brand: 'Mahindra', model: 'Scorpio-N' },
      jobCardSnapshot: { jobCardNumber: jobCard.jobCardNumber },
      items: [
        { itemType: 'SERVICE', itemName: 'Clutch Overhaul', unitPrice: 8000, quantity: 1, lineTotal: 8000 }
      ],
      createdBy: ownerUser._id
    });

    // Seed COMPLETED payment (INR 3,000)
    const completedPayment = await Payment.create({
      paymentReference: `PAY-P9-001`,
      invoiceId: issuedInvoice._id,
      customerId: customer._id,
      amount: 3000,
      paymentMethod: 'UPI',
      paymentDate: new Date(),
      status: 'COMPLETED',
      receivedBy: ownerUser._id
    });

    // Seed REVERSED payment (INR 500) - must NOT be counted in net collected cash
    const reversedPayment = await Payment.create({
      paymentReference: `PAY-P9-REV`,
      invoiceId: issuedInvoice._id,
      customerId: customer._id,
      amount: 500,
      paymentMethod: 'CASH',
      paymentDate: new Date(),
      status: 'REVERSED',
      reversalReason: 'Wrong amount entered',
      receivedBy: ownerUser._id
    });

    // Seed RECORDED operating expense (INR 1,200)
    const recordedExpense = await Expense.create({
      expenseNumber: `EXP-P9-001`,
      category: 'ELECTRICITY',
      title: 'Workshop Power Bill',
      amount: 1200,
      paymentMethod: 'BANK_TRANSFER',
      expenseDate: new Date(),
      status: 'RECORDED',
      createdBy: ownerUser._id
    });

    // Seed REVERSED operating expense (INR 400) - must be EXCLUDED
    const reversedExpense = await Expense.create({
      expenseNumber: `EXP-P9-REV`,
      category: 'TEA_FOOD',
      title: 'Snacks Order Reversal',
      amount: 400,
      paymentMethod: 'CASH',
      expenseDate: new Date(),
      status: 'REVERSED',
      reversalReason: 'Duplicate entry',
      createdBy: ownerUser._id
    });

    // Seed Supplier and Purchases
    const supplier = await Supplier.create({
      supplierCode: 'SUP-P9-001',
      businessName: 'Bosch Auto Spares',
      contactPerson: 'Kailash Bosch',
      mobileNumber: '9800099001',
      category: 'SPARE_PARTS',
      currentBalance: 1500,
      createdBy: ownerUser._id
    });

    // Seed RECORDED supplier purchase (INR 4,500 with 3,000 paid, 1,500 payable)
    const recordedPurchase = await SupplierPurchase.create({
      purchaseNumber: `PUR-P9-001`,
      supplierId: supplier._id,
      supplierSnapshot: {
        businessName: supplier.businessName,
        contactPerson: supplier.contactPerson,
        mobileNumber: supplier.mobileNumber
      },
      supplierInvoiceNumber: 'BOSCH-INV-99',
      purchaseDate: new Date(),
      purchaseStatus: 'RECORDED',
      status: 'RECORDED',
      paymentStatus: 'PARTIALLY_PAID',
      items: [
        { itemName: 'Front Brake Pads', quantity: 2, unitPrice: 2250, lineTotal: 4500 }
      ],
      subtotal: 4500,
      taxAmount: 0,
      grandTotal: 4500,
      amountPaid: 3000,
      balanceDue: 1500,
      createdBy: ownerUser._id
    });

    // Seed CANCELLED supplier purchase (INR 2,000) - must be EXCLUDED
    const cancelledPurchase = await SupplierPurchase.create({
      purchaseNumber: `PUR-P9-CANCELLED`,
      supplierId: supplier._id,
      supplierSnapshot: {
        businessName: supplier.businessName,
        contactPerson: supplier.contactPerson,
        mobileNumber: supplier.mobileNumber
      },
      supplierInvoiceNumber: 'BOSCH-INV-CAN',
      purchaseDate: new Date(),
      purchaseStatus: 'CANCELLED',
      status: 'CANCELLED',
      items: [
        { itemName: 'Faulty Sensor', quantity: 1, unitPrice: 2000, lineTotal: 2000 }
      ],
      subtotal: 2000,
      grandTotal: 2000,
      amountPaid: 0,
      balanceDue: 2000,
      createdBy: ownerUser._id
    });

    // Seed Supplier Payment Disbursement (INR 3,000)
    const supplierPayment = await SupplierPayment.create({
      paymentReference: `SPAY-P9-001`,
      supplierId: supplier._id,
      purchaseId: recordedPurchase._id,
      amount: 3000,
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date(),
      status: 'COMPLETED',
      receivedBy: ownerUser._id
    });

    // ==========================================
    // 1. SECURITY & ROLE ACCESS RESTRICTION TESTS
    // ==========================================
    await test('Unauthenticated request to financial overview returns 401 Unauthorized', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview`);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.success, false);
    });

    await test('SUPER_ADMIN access to financial overview is strictly blocked (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 403);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error?.code, 'FORBIDDEN');
    });

    await test('SUPER_ADMIN access to revenue report is blocked (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/revenue`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 403);
    });

    await test('SUPER_ADMIN access to expenses report is blocked (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/expenses`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 403);
    });

    await test('SUPER_ADMIN access to workshop operational analytics is ALLOWED (200 OK)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/workshop-performance?preset=today`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.summary);
    });

    await test('SUPER_ADMIN access to service performance operational report is ALLOWED (200 OK)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/service-performance?preset=today`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
    });

    await test('OWNER access to financial overview is ALLOWED (200 OK)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.revenue);
    });

    // ==========================================
    // 2. FINANCIAL AGGREGATION & EXCLUSION TESTS
    // ==========================================
    await test('Issued invoice totals include only ISSUED invoices (Excludes DRAFT and CANCELLED)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      const rev = json.data.revenue;
      // Should include only the INR 5,000 issued invoice, not 12,000 (draft) or 8,000 (cancelled)
      assert.strictEqual(rev.totalInvoiced, 5000);
      assert.strictEqual(rev.invoicesIssuedCount, 1);
    });

    await test('Cash collections calculate completed payments and exclude reversals', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      const rev = json.data.revenue;
      assert.strictEqual(rev.grossCollected, 3000);
      assert.strictEqual(rev.completedPaymentsCount, 1);
      assert.strictEqual(rev.reversalsCount, 1);
      assert.strictEqual(rev.totalReversedAmount, 500);
      assert.strictEqual(rev.netCashCollected, 2500);
    });

    await test('Operating expenses include only valid RECORDED records and exclude reversals', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      const exp = json.data.expenses;
      // Electricity 1,200 is RECORDED; Tea/Food 400 is REVERSED
      assert.strictEqual(exp.totalExpenses, 1200);
      assert.strictEqual(exp.expenseCount, 1);
      assert.strictEqual(exp.highestCategory?.category, 'ELECTRICITY');
    });

    await test('Supplier purchases calculate valid recorded purchases and exclude cancelled orders', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      const supp = json.data.suppliers;
      // Purchase 4,500 is RECORDED; Purchase 2,000 is CANCELLED
      assert.strictEqual(supp.totalPurchases, 4500);
      assert.strictEqual(supp.purchaseCount, 1);
      assert.strictEqual(supp.totalPaymentsDisbursed, 3000);
    });

    await test('Operating Cash Movement is defined as Cash Collected - (Expenses + Supplier Payments)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      const cf = json.data.cashFlowMethodology;
      // Net Cash Collected (2,500) - Operating Expenses (1,200) - Supplier Disbursements (3,000) = -1,700
      assert.strictEqual(cf.operatingCashMovement, -1700);
      assert.ok(cf.note.includes('COGS'));
      assert.ok(cf.note.includes('inventory'));
    });

    await test('Customer outstanding and Supplier payables are accurately calculated', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/overview?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      // Customer has balanceDue = 2000 on INV-P9-001
      assert.strictEqual(json.data.customerFinancials?.totalCustomerOutstanding, 2000);
      // Supplier has balanceDue = 1500 on PUR-P9-001
      assert.strictEqual(json.data.suppliers?.outstandingPayable, 1500);
    });

    // ==========================================
    // 3. SERVICE & WORKSHOP OPERATIONAL ANALYTICS
    // ==========================================
    await test('Service performance aggregates billed invoice line items and ranks revenue', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/service-performance?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      assert.strictEqual(json.success, true);
      const topItems = json.data.topBilledServices;
      assert.ok(Array.isArray(topItems));
      // Top billed item: Synthetic Engine Oil (3000) or Major Engine Service (2000)
      const oil = topItems.find((i) => i.itemName.includes('Oil'));
      assert.ok(oil);
      assert.strictEqual(oil.totalBilled, 3000);
    });

    await test('Workshop performance reports completion turnaround hours and conversion rate', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/workshop-performance?preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.summary?.totalJobCards, 1);
      assert.strictEqual(json.data.summary?.completedCount, 1);
      assert.ok(json.data.summary?.avgCompletionHours >= 0);
      assert.strictEqual(json.data.statusDistribution?.COMPLETED, 1);
    });

    // ==========================================
    // 4. DATE VALIDATION & PAGINATION LIMITS
    // ==========================================
    await test('Date filter validation rejects inverted date ranges (start > end)', async () => {
      const res = await fetch(
        `${BASE_URL}/api/v1/analytics/overview?preset=custom&dateFrom=2026-12-01&dateTo=2026-11-01`,
        { headers: { Cookie: cookieHeader(ownerCookies) } }
      );
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'INVALID_DATE_RANGE');
    });

    await test('Pagination enforces maximum limit of 100 on revenue reports', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/revenue?preset=today&limit=250`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.pagination?.limit, 100);
    });

    // ==========================================
    // 5. SECURE CSV EXPORT & FORMULA INJECTION SANITIZATION
    // ==========================================
    await test('SUPER_ADMIN attempting to export financial CSV is rejected (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/export?reportType=revenue&preset=today`, {
        headers: { Cookie: cookieHeader(superCookies) }
      });
      assert.strictEqual(res.status, 403);
    });

    await test('OWNER can export revenue CSV with sanitized cells preventing formula injection', async () => {
      // Seed an invoice with a potentially malicious formula prefix in customer name
      const maliciousCust = await Customer.create({
        fullName: '=cmd|/c calc!A0',
        mobileNumber: '9812349002',
        createdBy: ownerUser._id
      });

      const maliciousInv = await Invoice.create({
        invoiceNumber: `INV-P9-INJECT`,
        jobCardId: jobCard._id,
        customerId: maliciousCust._id,
        vehicleId: vehicle._id,
        invoiceStatus: 'ISSUED',
        paymentStatus: 'UNPAID',
        issueDate: new Date(),
        subtotal: 100,
        grandTotal: 100,
        amountPaid: 0,
        balanceDue: 100,
        customerSnapshot: { fullName: '=cmd|/c calc!A0', mobileNumber: '9812349002' },
        vehicleSnapshot: { registrationNumber: vehicle.registrationNumber, brand: 'Mahindra', model: 'Scorpio-N' },
        jobCardSnapshot: { jobCardNumber: jobCard.jobCardNumber },
        items: [
          { itemType: 'SERVICE', itemName: 'Basic Inspection', unitPrice: 100, quantity: 1, lineTotal: 100 }
        ],
        createdBy: ownerUser._id
      });

      const res = await fetch(`${BASE_URL}/api/v1/analytics/export?reportType=revenue&preset=today`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'text/csv; charset=utf-8');
      const csvText = await res.text();

      // Formula injection defense (CWE-1236): cell starting with '=' must be escaped with a single quote "'"
      assert.ok(csvText.includes("''=cmd|/c calc!A0") || csvText.includes("'=cmd|/c calc!A0"));
      assert.ok(!csvText.includes(',"=cmd|/c calc!A0"'));
    });

    await test('Exporting invalid reportType returns 400 Bad Request', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/analytics/export?reportType=invalid_type`, {
        headers: { Cookie: cookieHeader(ownerCookies) }
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.error?.code, 'INVALID_REPORT_TYPE');
    });

    console.log('\n======================================================');
    console.log(`Phase 9 tests completed: ${passedTests}/${totalTests} passed.`);
    console.log('======================================================\n');
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await disconnectDB();
  }
}

runPhase9Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 9 test suite failed:', err);
    process.exit(1);
  });
