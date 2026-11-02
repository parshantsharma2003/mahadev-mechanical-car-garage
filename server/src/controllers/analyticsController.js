import mongoose from 'mongoose';
import {
  Invoice,
  Payment,
  Expense,
  Supplier,
  SupplierPurchase,
  SupplierPayment,
  JobCard,
  Appointment,
  Customer,
  Vehicle
} from '../models/index.js';
import { resolveDateRange, jsonToCsv } from '../utils/analyticsHelpers.js';
import { roundCurrency } from '../utils/billingCalculations.js';

// ==========================================
// 1. GET ANALYTICS OVERVIEW (GET /api/v1/analytics/overview) [OWNER ONLY]
// ==========================================
export async function getAnalyticsOverview(req, res, next) {
  try {
    const { preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate, preset: resolvedPreset } = resolveDateRange(preset, dateFrom, dateTo);

    // Run parallel aggregation pipelines across financial and operational models
    const [
      invoicedAgg,
      invoiceStatusAgg,
      collectionsAgg,
      reversalsAgg,
      expensesAgg,
      expensesCatAgg,
      purchasesAgg,
      supplierPaymentsAgg,
      customerDuesAgg,
      supplierPayablesAgg,
      appointmentsAgg,
      jobCardsAgg,
      activeJobCardsCount,
      turnaroundAgg
    ] = await Promise.all([
      // 1. Total Invoiced (Issued invoices in period)
      Invoice.aggregate([
        {
          $match: {
            invoiceStatus: 'ISSUED',
            issueDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalInvoiced: { $sum: '$grandTotal' },
            count: { $sum: 1 },
            avgInvoiceValue: { $avg: '$grandTotal' }
          }
        }
      ]),

      // 2. Invoice Payment Status breakdown in period
      Invoice.aggregate([
        {
          $match: {
            invoiceStatus: 'ISSUED',
            issueDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$grandTotal' }
          }
        }
      ]),

      // 3. Collections (Completed payments in period)
      Payment.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            paymentDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 4. Reversed customer payments in period
      Payment.aggregate([
        {
          $match: {
            status: 'REVERSED',
            paymentDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalReversed: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 5. Operating Expenses in period
      Expense.aggregate([
        {
          $match: {
            status: 'RECORDED',
            expenseDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 6. Expense Category Breakdown in period
      Expense.aggregate([
        {
          $match: {
            status: 'RECORDED',
            expenseDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // 7. Supplier Purchases in period
      SupplierPurchase.aggregate([
        {
          $match: {
            $or: [{ purchaseStatus: 'RECORDED' }, { status: 'RECORDED' }],
            purchaseDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 8. Supplier Payments Made in period
      SupplierPayment.aggregate([
        {
          $match: {
            status: 'COMPLETED',
            paymentDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSupplierPayments: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 9. Total Customer Outstanding Balance (Lifetime snapshot)
      Invoice.aggregate([
        {
          $match: {
            invoiceStatus: 'ISSUED',
            paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] }
          }
        },
        {
          $group: {
            _id: null,
            totalCustomerOutstanding: { $sum: '$balanceDue' },
            customersWithDuesCount: { $addToSet: '$customerId' },
            unpaidInvoicesCount: { $sum: 1 }
          }
        }
      ]),

      // 10. Total Supplier Outstanding Payable (Lifetime snapshot)
      SupplierPurchase.aggregate([
        {
          $match: {
            $or: [{ purchaseStatus: 'RECORDED' }, { status: 'RECORDED' }],
            paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] }
          }
        },
        {
          $group: {
            _id: null,
            totalSupplierPayable: { $sum: '$balanceDue' },
            suppliersWithDuesCount: { $addToSet: '$supplierId' },
            unpaidPurchasesCount: { $sum: 1 }
          }
        }
      ]),

      // 11. Appointments in period
      Appointment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // 12. Job Cards in period
      JobCard.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            uniqueVehicles: { $addToSet: '$vehicleId' }
          }
        }
      ]),

      // 13. Active Job Cards currently in workshop bays
      JobCard.countDocuments({
        status: { $in: ['CREATED', 'INSPECTION', 'WAITING_FOR_APPROVAL', 'IN_PROGRESS', 'QUALITY_CHECK'] }
      }),

      // 14. Average Turnaround Time for completed jobs in period
      JobCard.aggregate([
        {
          $match: {
            status: { $in: ['COMPLETED', 'DELIVERED'] },
            completedAt: { $exists: true, $ne: null },
            completedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $project: {
            durationHours: {
              $divide: [
                { $subtract: ['$completedAt', { $ifNull: ['$startedAt', '$createdAt'] }] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgHours: { $avg: '$durationHours' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Financial Values
    const totalInvoiced = roundCurrency(invoicedAgg[0]?.totalInvoiced || 0);
    const invoiceCount = invoicedAgg[0]?.count || 0;
    const avgInvoiceValue = roundCurrency(invoicedAgg[0]?.avgInvoiceValue || 0);

    const grossCollected = roundCurrency(collectionsAgg[0]?.totalCollected || 0);
    const totalReversed = roundCurrency(reversalsAgg[0]?.totalReversed || 0);
    const netCashCollected = roundCurrency(Math.max(0, grossCollected - totalReversed));

    const totalExpenses = roundCurrency(expensesAgg[0]?.totalExpenses || 0);
    const expenseCount = expensesAgg[0]?.count || 0;

    const totalPurchases = roundCurrency(purchasesAgg[0]?.totalPurchases || 0);
    const purchaseCount = purchasesAgg[0]?.count || 0;

    const totalSupplierPayments = roundCurrency(supplierPaymentsAgg[0]?.totalSupplierPayments || 0);

    // Operating Cash Movement = Net Cash Collected - (Actual Cash Expenses + Actual Supplier Disbursements)
    const operatingCashMovement = roundCurrency(netCashCollected - (totalExpenses + totalSupplierPayments));

    // Balances
    const totalCustomerOutstanding = roundCurrency(customerDuesAgg[0]?.totalCustomerOutstanding || 0);
    const customersWithDues = customerDuesAgg[0]?.customersWithDuesCount?.length || 0;

    const totalSupplierPayable = roundCurrency(supplierPayablesAgg[0]?.totalSupplierPayable || 0);
    const suppliersWithPayables = supplierPayablesAgg[0]?.suppliersWithDuesCount?.length || 0;

    // Status maps
    const invoiceStatuses = { PAID: 0, PARTIALLY_PAID: 0, UNPAID: 0 };
    invoiceStatusAgg.forEach((item) => {
      if (invoiceStatuses[item._id] !== undefined) invoiceStatuses[item._id] = item.count;
    });

    const appointmentCounts = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, TOTAL: 0 };
    appointmentsAgg.forEach((item) => {
      appointmentCounts.TOTAL += item.count;
      if (appointmentCounts[item._id] !== undefined) appointmentCounts[item._id] = item.count;
    });

    let totalJobCardsInPeriod = 0;
    let completedJobCardsInPeriod = 0;
    const vehicleSet = new Set();
    const jobCardStatusMap = {};

    jobCardsAgg.forEach((item) => {
      totalJobCardsInPeriod += item.count;
      jobCardStatusMap[item._id] = item.count;
      if (['COMPLETED', 'DELIVERED'].includes(item._id)) {
        completedJobCardsInPeriod += item.count;
      }
      if (Array.isArray(item.uniqueVehicles)) {
        item.uniqueVehicles.forEach((v) => vehicleSet.add(String(v)));
      }
    });

    const appointmentConversionRate =
      appointmentCounts.TOTAL > 0
        ? roundCurrency((totalJobCardsInPeriod / appointmentCounts.TOTAL) * 100)
        : 0;

    const avgTurnaroundHours = turnaroundAgg[0]?.avgHours
      ? roundCurrency(turnaroundAgg[0].avgHours)
      : null;

    const methodologyText =
      'Estimated Operating Cash Movement represents liquid cash in (customer payments minus refunds) minus liquid cash out (operational overheads and disbursements to parts suppliers). It excludes credit purchases, asset depreciation, inventory stock valuation, COGS, and pending liabilities.';

    const revenueObj = {
      totalInvoiced,
      invoicesIssuedCount: invoiceCount,
      invoiceCount,
      avgInvoiceValue,
      grossCollected,
      totalPaymentsReceived: grossCollected,
      totalCashCollected: grossCollected,
      totalReversed,
      totalReversedAmount: totalReversed,
      reversalsCount: reversalsAgg[0]?.count || 0,
      completedPaymentsCount: collectionsAgg[0]?.count || 0,
      netCashCollected,
      invoicesPaidCount: invoiceStatuses.PAID,
      invoicesPartiallyPaidCount: invoiceStatuses.PARTIALLY_PAID,
      invoicesUnpaidCount: invoiceStatuses.UNPAID
    };

    const suppliersObj = {
      totalPurchases,
      purchaseCount,
      totalPaymentsDisbursed: totalSupplierPayments,
      totalSupplierPayments,
      outstandingPayable: totalSupplierPayable,
      totalSupplierPayable,
      suppliersWithPayables
    };

    const customerFinancialsObj = {
      totalCustomerOutstanding,
      customersWithOutstandingCount: customersWithDues,
      customersWithDues
    };

    const expensesObj = {
      totalExpenses,
      expenseCount,
      highestCategory: {
        category: expensesCatAgg[0]?._id || 'N/A',
        totalAmount: roundCurrency(expensesCatAgg[0]?.total || 0)
      },
      highestCategoryName: expensesCatAgg[0]?._id || 'N/A',
      highestCategoryAmount: roundCurrency(expensesCatAgg[0]?.total || 0),
      categoryBreakdown: expensesCatAgg.map((c) => ({
        category: c._id,
        totalAmount: roundCurrency(c.total),
        amount: roundCurrency(c.total),
        count: c.count
      }))
    };

    const workshopObj = {
      totalAppointments: appointmentCounts.TOTAL,
      confirmedAppointments: appointmentCounts.CONFIRMED,
      completedAppointments: appointmentCounts.COMPLETED,
      cancelledAppointments: appointmentCounts.CANCELLED,
      totalJobCards: totalJobCardsInPeriod,
      totalJobCardsCreated: totalJobCardsInPeriod,
      completedJobCards: completedJobCardsInPeriod,
      activeJobCardsInShop: activeJobCardsCount,
      activeJobCardsInProgress: activeJobCardsCount,
      uniqueVehiclesServiced: vehicleSet.size,
      appointmentConversionRate,
      avgCompletionTimeHours: avgTurnaroundHours || 0,
      avgTurnaroundHours,
      statusDistribution: jobCardStatusMap
    };

    const cashFlowObj = {
      inflowCashCollected: netCashCollected,
      outflowExpenses: totalExpenses,
      outflowSupplierPayments: totalSupplierPayments,
      operatingCashMovement,
      netOperatingCashMovement: operatingCashMovement,
      methodologyNote: methodologyText,
      note: methodologyText
    };

    return res.status(200).json({
      success: true,
      data: {
        filter: {
          preset: resolvedPreset,
          startDate,
          endDate
        },
        dateRange: {
          start: startDate,
          end: endDate
        },
        revenue: revenueObj,
        revenueAndCollections: revenueObj,
        expenses: expensesObj,
        suppliers: suppliersObj,
        supplierFinancials: suppliersObj,
        customerFinancials: customerFinancialsObj,
        cashFlow: cashFlowObj,
        cashFlowMethodology: cashFlowObj,
        workshop: workshopObj,
        workshopPerformance: workshopObj
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 2. FINANCIAL SUMMARY & RECONCILIATION (GET /api/v1/analytics/financial-summary) [OWNER ONLY]
// ==========================================
export async function getFinancialSummary(req, res, next) {
  try {
    const { months = 6 } = req.query;
    const numMonths = Math.min(12, Math.max(3, parseInt(months, 10) || 6));

    const now = new Date();
    const trendData = [];

    for (let i = numMonths - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      const [invAgg, colAgg, expAgg, purAgg, supPayAgg] = await Promise.all([
        Invoice.aggregate([
          { $match: { invoiceStatus: 'ISSUED', issueDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } }
        ]),
        Payment.aggregate([
          { $match: { status: 'COMPLETED', paymentDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          { $match: { status: 'RECORDED', expenseDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        SupplierPurchase.aggregate([
          { $match: { purchaseStatus: 'RECORDED', purchaseDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } }
        ]),
        SupplierPayment.aggregate([
          { $match: { status: 'COMPLETED', paymentDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const invoiced = roundCurrency(invAgg[0]?.total || 0);
      const collected = roundCurrency(colAgg[0]?.total || 0);
      const expenses = roundCurrency(expAgg[0]?.total || 0);
      const purchases = roundCurrency(purAgg[0]?.total || 0);
      const supplierDisbursements = roundCurrency(supPayAgg[0]?.total || 0);
      const cashMovement = roundCurrency(collected - (expenses + supplierDisbursements));

      trendData.push({
        month: monthLabel,
        monthStart,
        monthEnd,
        invoiced,
        collected,
        expenses,
        purchases,
        supplierDisbursements,
        cashMovement
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        trendData,
        methodology: {
          invoicedRevenue: 'Sum of all non-cancelled, non-draft invoices issued in month.',
          cashCollected: 'Actual cash/UPI/bank receipts received from customers.',
          operatingExpenses: 'Direct garage overheads (electricity, rent, salaries, consumables).',
          supplierPurchases: 'Parts and inventory bought from suppliers (both cash and credit).',
          supplierDisbursements: 'Actual money paid out to suppliers.',
          cashMovement: 'Net liquidity change: (Collections) - (Expenses + Supplier Payments).'
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 3. REVENUE REPORT (GET /api/v1/analytics/revenue) [OWNER ONLY]
// ==========================================
export async function getRevenueReport(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { preset, dateFrom, dateTo, paymentStatus, sortBy = 'newest' } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const filter = {
      invoiceStatus: 'ISSUED',
      issueDate: { $gte: startDate, $lte: endDate }
    };

    if (paymentStatus && ['PAID', 'PARTIALLY_PAID', 'UNPAID'].includes(paymentStatus.toUpperCase())) {
      filter.paymentStatus = paymentStatus.toUpperCase();
    }

    let sort = { issueDate: -1 };
    if (sortBy === 'highest_amount') sort = { grandTotal: -1 };
    if (sortBy === 'balance_due') sort = { balanceDue: -1 };

    const [invoices, total, summaryAgg] = await Promise.all([
      Invoice.find(filter)
        .populate('customerId', 'fullName mobileNumber')
        .populate('vehicleId', 'brand model registrationNumberDisplay')
        .populate('jobCardId', 'jobCardNumber serviceType')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
      Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSubtotal: { $sum: '$subtotal' },
            totalDiscount: { $sum: '$discountAmount' },
            totalTax: { $sum: '$taxAmount' },
            totalGrand: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$amountPaid' },
            totalDue: { $sum: '$balanceDue' }
          }
        }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        summary: {
          subtotal: roundCurrency(summaryAgg[0]?.totalSubtotal || 0),
          discount: roundCurrency(summaryAgg[0]?.totalDiscount || 0),
          tax: roundCurrency(summaryAgg[0]?.totalTax || 0),
          grandTotal: roundCurrency(summaryAgg[0]?.totalGrand || 0),
          amountPaid: roundCurrency(summaryAgg[0]?.totalPaid || 0),
          balanceDue: roundCurrency(summaryAgg[0]?.totalDue || 0)
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 4. COLLECTIONS REPORT (GET /api/v1/analytics/collections) [OWNER ONLY]
// ==========================================
export async function getCollectionsReport(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { preset, dateFrom, dateTo, paymentMethod, status = 'COMPLETED' } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const filter = {
      paymentDate: { $gte: startDate, $lte: endDate }
    };

    if (status && ['COMPLETED', 'REVERSED'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod.toUpperCase();
    }

    const [payments, total, sumAgg] = await Promise.all([
      Payment.find(filter)
        .populate('customerId', 'fullName mobileNumber')
        .populate('invoiceId', 'invoiceNumber grandTotal')
        .populate('receivedBy', 'fullName role')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalCollected = roundCurrency(sumAgg.reduce((sum, item) => sum + item.total, 0));

    return res.status(200).json({
      success: true,
      data: {
        payments,
        summary: {
          totalCollected,
          byMethod: sumAgg.map((m) => ({ method: m._id, total: roundCurrency(m.total), count: m.count }))
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 5. EXPENSES ANALYTICS (GET /api/v1/analytics/expenses) [OWNER ONLY]
// ==========================================
export async function getExpenseAnalytics(req, res, next) {
  try {
    const { preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const [categoryAgg, trendAgg, totalAgg] = await Promise.all([
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { totalAmount: -1 } }
      ]),
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$expenseDate' } },
            dailyTotal: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Expense.aggregate([
        { $match: { status: 'RECORDED', expenseDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const total = roundCurrency(totalAgg[0]?.total || 0);

    return res.status(200).json({
      success: true,
      data: {
        totalAmount: total,
        count: totalAgg[0]?.count || 0,
        categoryBreakdown: categoryAgg.map((c) => ({
          category: c._id,
          totalAmount: roundCurrency(c.totalAmount),
          count: c.count,
          percentage: total > 0 ? roundCurrency((c.totalAmount / total) * 100) : 0
        })),
        dailyTrend: trendAgg.map((t) => ({
          date: t._id,
          amount: roundCurrency(t.dailyTotal),
          count: t.count
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 6. SUPPLIER ANALYTICS (GET /api/v1/analytics/suppliers) [OWNER ONLY]
// ==========================================
export async function getSupplierAnalytics(req, res, next) {
  try {
    const { preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const [topSuppliersAgg, purchasesTotalAgg, paymentsTotalAgg] = await Promise.all([
      SupplierPurchase.aggregate([
        { $match: { purchaseStatus: 'RECORDED', purchaseDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$supplierId',
            totalPurchased: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$amountPaid' },
            totalBalanceDue: { $sum: '$balanceDue' },
            purchaseCount: { $sum: 1 }
          }
        },
        { $sort: { totalPurchased: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'suppliers',
            localField: '_id',
            foreignField: '_id',
            as: 'supplierDoc'
          }
        },
        { $unwind: '$supplierDoc' }
      ]),
      SupplierPurchase.aggregate([
        { $match: { purchaseStatus: 'RECORDED', purchaseDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      SupplierPayment.aggregate([
        { $match: { status: 'COMPLETED', paymentDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalPurchases: roundCurrency(purchasesTotalAgg[0]?.total || 0),
        purchaseCount: purchasesTotalAgg[0]?.count || 0,
        totalPayments: roundCurrency(paymentsTotalAgg[0]?.total || 0),
        paymentCount: paymentsTotalAgg[0]?.count || 0,
        topSuppliers: topSuppliersAgg.map((s) => ({
          supplierId: s._id,
          supplierCode: s.supplierDoc.supplierCode,
          businessName: s.supplierDoc.businessName,
          category: s.supplierDoc.supplierCategory,
          totalPurchased: roundCurrency(s.totalPurchased),
          totalPaid: roundCurrency(s.totalPaid),
          totalBalanceDue: roundCurrency(s.totalBalanceDue),
          purchaseCount: s.purchaseCount
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 7. CUSTOMER INSIGHTS (GET /api/v1/analytics/customer-insights) [OWNER ONLY]
// ==========================================
export async function getCustomerInsights(req, res, next) {
  try {
    const { preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const [totalCustomers, newCustomersInPeriod, topCustomersAgg, repeatStatsAgg] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Invoice.aggregate([
        { $match: { invoiceStatus: 'ISSUED' } },
        {
          $group: {
            _id: '$customerId',
            lifetimeBilled: { $sum: '$grandTotal' },
            lifetimePaid: { $sum: '$amountPaid' },
            outstandingDue: { $sum: '$balanceDue' },
            invoicesCount: { $sum: 1 }
          }
        },
        { $sort: { lifetimeBilled: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customerDoc'
          }
        },
        { $unwind: '$customerDoc' }
      ]),
      JobCard.aggregate([
        { $match: { status: { $in: ['COMPLETED', 'DELIVERED'] } } },
        {
          $group: {
            _id: '$customerId',
            completedJobCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalCustomersWithCompletedJobs: { $sum: 1 },
            repeatCustomers: {
              $sum: { $cond: [{ $gte: ['$completedJobCount', 2] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const totalWithJobs = repeatStatsAgg[0]?.totalCustomersWithCompletedJobs || 0;
    const repeatCount = repeatStatsAgg[0]?.repeatCustomers || 0;
    const repeatServiceRate = totalWithJobs > 0 ? roundCurrency((repeatCount / totalWithJobs) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        newCustomersInPeriod,
        returningCustomersInPeriod: Math.max(0, totalCustomers - newCustomersInPeriod),
        repeatServiceRate,
        topCustomers: topCustomersAgg.map((c) => ({
          customerId: c._id,
          fullName: c.customerDoc.fullName,
          mobileNumber: c.customerDoc.mobileNumber,
          lifetimeBilled: roundCurrency(c.lifetimeBilled),
          lifetimePaid: roundCurrency(c.lifetimePaid),
          outstandingDue: roundCurrency(c.outstandingDue),
          invoicesCount: c.invoicesCount
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 8. SERVICE PERFORMANCE (GET /api/v1/analytics/service-performance) [STAFF ACCESS]
// ==========================================
export async function getServicePerformance(req, res, next) {
  try {
    const { preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const [serviceItemAgg, jobCardTypeAgg] = await Promise.all([
      Invoice.aggregate([
        { $match: { invoiceStatus: 'ISSUED', issueDate: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.itemName',
            category: { $first: '$items.itemType' },
            totalBilled: { $sum: '$items.lineTotal' },
            timesPerformed: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalBilled: -1 } },
        { $limit: 15 }
      ]),
      JobCard.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$serviceType',
            count: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $in: ['$status', ['COMPLETED', 'DELIVERED']] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        topBilledServices: serviceItemAgg.map((s) => ({
          _id: s._id,
          itemName: s._id,
          serviceName: s._id,
          itemType: s.category,
          totalBilled: roundCurrency(s.totalBilled),
          timesPerformed: s.timesPerformed,
          totalQtySold: s.timesPerformed,
          avgTicket: s.timesPerformed > 0 ? roundCurrency(s.totalBilled / s.timesPerformed) : 0
        })),
        workshopJobTypes: jobCardTypeAgg.map((j) => ({
          serviceType: j._id,
          totalCreated: j.count,
          totalCompleted: j.completedCount
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 9. WORKSHOP PERFORMANCE (GET /api/v1/analytics/workshop-performance) [STAFF ACCESS]
// ==========================================
export async function getWorkshopPerformance(req, res, next) {
  try {
    const { preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const [statusDistributionAgg, dailyCreatedAgg, turnaroundAgg, apptsCount] = await Promise.all([
      JobCard.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      JobCard.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            created: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      JobCard.aggregate([
        {
          $match: {
            status: { $in: ['COMPLETED', 'DELIVERED'] },
            completedAt: { $exists: true, $ne: null },
            completedAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $project: {
            durationHours: {
              $divide: [
                { $subtract: ['$completedAt', { $ifNull: ['$startedAt', '$createdAt'] }] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgHours: { $avg: '$durationHours' },
            count: { $sum: 1 }
          }
        }
      ]),
      Appointment.countDocuments({
        preferredDate: { $gte: startDate, $lte: endDate }
      })
    ]);

    const statusMap = {};
    let totalCount = 0;
    statusDistributionAgg.forEach((s) => {
      statusMap[s._id] = s.count;
      totalCount += s.count;
    });

    const completedCount = (statusMap['COMPLETED'] || 0) + (statusMap['DELIVERED'] || 0);
    const avgHours = turnaroundAgg[0]?.avgHours ? roundCurrency(turnaroundAgg[0].avgHours) : 0;
    const conversionRate = apptsCount > 0 ? Math.round((completedCount / apptsCount) * 100) : (totalCount > 0 ? 100 : 0);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalJobCards: totalCount,
          completedCount,
          avgCompletionHours: avgHours,
          conversionRate
        },
        totalJobCardsInPeriod: totalCount,
        statusDistribution: statusMap,
        dailyCreated: dailyCreatedAgg.map((d) => ({ date: d._id, count: d.created })),
        avgTurnaroundHours: avgHours,
        completedJobsSampled: turnaroundAgg[0]?.count || 0
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 10. OUTSTANDING CUSTOMERS (GET /api/v1/analytics/outstanding-customers) [OWNER ONLY]
// ==========================================
export async function getOutstandingCustomersReport(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { sortBy = 'highest' } = req.query;

    const now = new Date();

    const pipeline = [
      {
        $match: {
          invoiceStatus: 'ISSUED',
          paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
          balanceDue: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerDoc'
        }
      },
      { $unwind: '$customerDoc' },
      {
        $project: {
          invoiceNumber: 1,
          issueDate: 1,
          grandTotal: 1,
          amountPaid: 1,
          balanceDue: 1,
          paymentStatus: 1,
          customerId: 1,
          customerName: '$customerDoc.fullName',
          mobileNumber: '$customerDoc.mobileNumber',
          daysOutstanding: {
            $floor: {
              $divide: [{ $subtract: [now, '$issueDate'] }, 1000 * 60 * 60 * 24]
            }
          }
        }
      }
    ];

    if (sortBy === 'oldest') {
      pipeline.push({ $sort: { daysOutstanding: -1 } });
    } else {
      pipeline.push({ $sort: { balanceDue: -1 } });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

    const [dataRes, countRes, totalSumAgg] = await Promise.all([
      Invoice.aggregate(dataPipeline),
      Invoice.aggregate(countPipeline),
      Invoice.aggregate([
        {
          $match: {
            invoiceStatus: 'ISSUED',
            paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
            balanceDue: { $gt: 0 }
          }
        },
        { $group: { _id: null, totalDue: { $sum: '$balanceDue' } } }
      ])
    ]);

    const total = countRes[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        records: dataRes.map((r) => ({
          ...r,
          grandTotal: roundCurrency(r.grandTotal),
          amountPaid: roundCurrency(r.amountPaid),
          balanceDue: roundCurrency(r.balanceDue)
        })),
        totalOutstanding: roundCurrency(totalSumAgg[0]?.totalDue || 0),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 11. OUTSTANDING SUPPLIERS (GET /api/v1/analytics/outstanding-suppliers) [OWNER ONLY]
// ==========================================
export async function getOutstandingSuppliersReport(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $match: {
          purchaseStatus: 'RECORDED',
          paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
          balanceDue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$supplierId',
          totalPurchases: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          totalPayable: { $sum: '$balanceDue' },
          unpaidCount: { $sum: 1 },
          oldestPurchaseDate: { $min: '$purchaseDate' }
        }
      },
      { $sort: { totalPayable: -1 } },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierDoc'
        }
      },
      { $unwind: '$supplierDoc' },
      {
        $project: {
          supplierId: '$_id',
          supplierCode: '$supplierDoc.supplierCode',
          businessName: '$supplierDoc.businessName',
          contactPerson: '$supplierDoc.contactPerson',
          mobileNumber: '$supplierDoc.mobileNumber',
          category: '$supplierDoc.supplierCategory',
          totalPurchases: 1,
          totalPaid: 1,
          totalPayable: 1,
          unpaidCount: 1,
          oldestPurchaseDate: 1
        }
      }
    ];

    const [dataRes, totalPayableAgg] = await Promise.all([
      SupplierPurchase.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      SupplierPurchase.aggregate([
        {
          $match: {
            purchaseStatus: 'RECORDED',
            paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
            balanceDue: { $gt: 0 }
          }
        },
        { $group: { _id: null, totalDue: { $sum: '$balanceDue' } } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        records: dataRes.map((s) => ({
          ...s,
          totalPurchases: roundCurrency(s.totalPurchases),
          totalPaid: roundCurrency(s.totalPaid),
          totalPayable: roundCurrency(s.totalPayable)
        })),
        totalOutstandingPayable: roundCurrency(totalPayableAgg[0]?.totalDue || 0),
        pagination: {
          page,
          limit,
          total: dataRes.length,
          pages: 1
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 12. EXPORT ANALYTICS CSV (GET /api/v1/analytics/export) [OWNER/STAFF AUTHORIZED]
// ==========================================
export async function exportAnalyticsReportCsv(req, res, next) {
  try {
    const { reportType, preset, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = resolveDateRange(preset, dateFrom, dateTo);

    const type = String(reportType || '').trim().toLowerCase();

    // Financial reports are restricted to OWNER role
    const financialReports = ['revenue', 'collections', 'expenses', 'purchases', 'outstanding-customers', 'outstanding-suppliers'];
    if (financialReports.includes(type) && req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Financial CSV exports are strictly restricted to OWNER role.' }
      });
    }

    let csvContent = '';
    const dateFormatted = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'revenue': {
        const invoices = await Invoice.find({
          invoiceStatus: 'ISSUED',
          issueDate: { $gte: startDate, $lte: endDate }
        })
          .populate('customerId', 'fullName mobileNumber')
          .sort({ issueDate: -1 })
          .lean();

        const headers = [
          { key: 'invoiceNumber', label: 'Invoice #' },
          { key: 'date', label: 'Issue Date' },
          { key: 'customer', label: 'Customer Name' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'grandTotal', label: 'Grand Total (INR)' },
          { key: 'amountPaid', label: 'Paid (INR)' },
          { key: 'balanceDue', label: 'Balance Due (INR)' },
          { key: 'paymentStatus', label: 'Payment Status' }
        ];

        const rows = invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          date: inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : '',
          customer: inv.customerSnapshot?.fullName || inv.customerId?.fullName || '',
          mobile: inv.customerSnapshot?.mobileNumber || inv.customerId?.mobileNumber || '',
          grandTotal: inv.grandTotal,
          amountPaid: inv.amountPaid,
          balanceDue: inv.balanceDue,
          paymentStatus: inv.paymentStatus
        }));

        csvContent = jsonToCsv(headers, rows);
        break;
      }

      case 'collections': {
        const payments = await Payment.find({
          status: 'COMPLETED',
          paymentDate: { $gte: startDate, $lte: endDate }
        })
          .populate('customerId', 'fullName mobileNumber')
          .populate('invoiceId', 'invoiceNumber')
          .sort({ paymentDate: -1 })
          .lean();

        const headers = [
          { key: 'paymentRef', label: 'Payment Reference' },
          { key: 'date', label: 'Payment Date' },
          { key: 'invoice', label: 'Invoice #' },
          { key: 'customer', label: 'Customer' },
          { key: 'method', label: 'Payment Method' },
          { key: 'amount', label: 'Amount Received (INR)' },
          { key: 'txnRef', label: 'Transaction / UTR Ref' }
        ];

        const rows = payments.map((p) => ({
          paymentRef: p.paymentReference,
          date: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '',
          invoice: p.invoiceId?.invoiceNumber || 'DIRECT',
          customer: p.customerId?.fullName || '',
          method: p.paymentMethod,
          amount: p.amount,
          txnRef: p.transactionReference || ''
        }));

        csvContent = jsonToCsv(headers, rows);
        break;
      }

      case 'expenses': {
        const expenses = await Expense.find({
          status: 'RECORDED',
          expenseDate: { $gte: startDate, $lte: endDate }
        })
          .sort({ expenseDate: -1 })
          .lean();

        const headers = [
          { key: 'expenseNumber', label: 'Expense #' },
          { key: 'date', label: 'Expense Date' },
          { key: 'category', label: 'Category' },
          { key: 'title', label: 'Title / Payee' },
          { key: 'method', label: 'Payment Mode' },
          { key: 'amount', label: 'Amount (INR)' },
          { key: 'receiptRef', label: 'Receipt Ref' }
        ];

        const rows = expenses.map((e) => ({
          expenseNumber: e.expenseNumber,
          date: e.expenseDate ? new Date(e.expenseDate).toISOString().split('T')[0] : '',
          category: e.category,
          title: e.title,
          method: e.paymentMethod,
          amount: e.amount,
          receiptRef: e.receiptReference || ''
        }));

        csvContent = jsonToCsv(headers, rows);
        break;
      }

      case 'outstanding-customers': {
        const dues = await Invoice.find({
          invoiceStatus: 'ISSUED',
          paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
          balanceDue: { $gt: 0 }
        })
          .populate('customerId', 'fullName mobileNumber')
          .sort({ balanceDue: -1 })
          .lean();

        const now = new Date();
        const headers = [
          { key: 'invoiceNumber', label: 'Invoice #' },
          { key: 'customer', label: 'Customer Name' },
          { key: 'mobile', label: 'Phone' },
          { key: 'date', label: 'Invoice Date' },
          { key: 'days', label: 'Days Outstanding' },
          { key: 'grandTotal', label: 'Billed (INR)' },
          { key: 'amountPaid', label: 'Paid (INR)' },
          { key: 'balanceDue', label: 'Due (INR)' }
        ];

        const rows = dues.map((d) => {
          const days = d.issueDate
            ? Math.floor((now - new Date(d.issueDate)) / (1000 * 60 * 60 * 24))
            : 0;
          return {
            invoiceNumber: d.invoiceNumber,
            customer: d.customerSnapshot?.fullName || d.customerId?.fullName || '',
            mobile: d.customerSnapshot?.mobileNumber || d.customerId?.mobileNumber || '',
            date: d.issueDate ? new Date(d.issueDate).toISOString().split('T')[0] : '',
            days,
            grandTotal: d.grandTotal,
            amountPaid: d.amountPaid,
            balanceDue: d.balanceDue
          };
        });

        csvContent = jsonToCsv(headers, rows);
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REPORT_TYPE',
            message: 'Valid reportType options: revenue, collections, expenses, outstanding-customers'
          }
        });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${dateFormatted}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}
