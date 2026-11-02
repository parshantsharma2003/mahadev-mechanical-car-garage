import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { Enquiry } from '../models/Enquiry.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Service } from '../models/Service.js';
import { GalleryItem } from '../models/GalleryItem.js';
import { Review } from '../models/Review.js';
import { BusinessSetting } from '../models/BusinessSetting.js';
import { AuditLog } from '../models/AuditLog.js';
import { createAuditRecord } from '../services/auditService.js';
import { normalizeIndianPhone, normalizeRegistrationNumber } from '../utils/normalizers.js';
import { isTransactionSupported } from '../config/db.js';

const ALLOWED_APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
];

const VALID_APPOINTMENT_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'REJECTED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: []
};

const ALLOWED_ENQUIRY_STATUSES = [
  'NEW',
  'PENDING',
  'CONTACTED',
  'RESOLVED'
];

const VALID_ENQUIRY_TRANSITIONS = {
  NEW: ['PENDING', 'CONTACTED', 'RESOLVED'],
  PENDING: ['CONTACTED', 'RESOLVED'],
  CONTACTED: ['RESOLVED'],
  RESOLVED: []
};

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Escapes regex metacharacters to prevent ReDoS and regex syntax errors.
 */
function escapeRegex(text) {
  return String(text || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates media URLs: allows https/http or local asset paths, rejects unsafe schemes (javascript:, data:, etc.)
 */
function isValidMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (/^(javascript|vbscript|data|file):/i.test(trimmed)) return false;
  return trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed);
}

// ==========================================
// DASHBOARD OPERATIONAL KPIS & SUMMARY
// ==========================================

/**
 * GET /api/v1/admin/dashboard/stats
 * Aggregate key operational indicators without mock financial metrics.
 */
export async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();

    // Start of week (Monday 00:00:00)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Today's range (00:00:00 to 23:59:59.999)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalBookingsThisWeek,
      pendingBookingsCount,
      confirmedTodayCount,
      unresolvedEnquiriesCount,
      statusDistributionRaw,
      todayAppointments,
      recentBookings,
      recentEnquiries
    ] = await Promise.all([
      Appointment.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Appointment.countDocuments({ status: 'PENDING' }),
      Appointment.countDocuments({
        preferredDate: { $gte: startOfToday, $lte: endOfToday },
        status: { $in: ['CONFIRMED', 'IN_PROGRESS'] }
      }),
      Enquiry.countDocuments({
        status: { $in: ['NEW', 'PENDING', 'CONTACTED'] }
      }),
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Appointment.find({
        preferredDate: { $gte: startOfToday, $lte: endOfToday }
      })
        .populate('customerId', 'fullName mobileNumber')
        .populate('vehicleId', 'brand model registrationNumberDisplay')
        .sort({ preferredDate: 1 })
        .limit(20)
        .lean(),
      Appointment.find()
        .populate('customerId', 'fullName mobileNumber')
        .populate('vehicleId', 'brand model registrationNumberDisplay')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Enquiry.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    // Build status distribution map
    const statusDistribution = {
      PENDING: 0,
      CONFIRMED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REJECTED: 0
    };
    statusDistributionRaw.forEach((item) => {
      if (item._id && statusDistribution[item._id] !== undefined) {
        statusDistribution[item._id] = item.count;
      }
    });

    let recentActivity = [];
    if (req.user && req.user.role === 'OWNER') {
      recentActivity = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        kpi: {
          totalBookingsThisWeek,
          pendingBookingsCount,
          confirmedTodayCount,
          unresolvedEnquiriesCount
        },
        statusDistribution,
        todayAppointments,
        recentBookings,
        recentEnquiries,
        recentActivity
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// APPOINTMENTS OPERATIONAL ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/appointments
 * List appointments with pagination, status filtering, and search.
 */
export async function listAppointments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && typeof req.query.status === 'string') {
      const statusUpper = req.query.status.trim().toUpperCase();
      if (ALLOWED_APPOINTMENT_STATUSES.includes(statusUpper)) {
        filter.status = statusUpper;
      }
    }

    if (req.query.dateFrom || req.query.dateTo) {
      filter.preferredDate = {};
      if (req.query.dateFrom) {
        filter.preferredDate.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        filter.preferredDate.$lte = new Date(req.query.dateTo);
      }
    }

    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$or = [
        { bookingReference: searchRegex },
        { 'customerSnapshot.fullName': searchRegex },
        { 'customerSnapshot.mobileNumber': searchRegex },
        { 'vehicleSnapshot.brand': searchRegex },
        { 'vehicleSnapshot.model': searchRegex },
        { 'vehicleSnapshot.registrationNumber': searchRegex }
      ];
    }

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .populate('customerId', 'fullName mobileNumber email city')
        .populate('vehicleId', 'brand model registrationNumberClean registrationNumberDisplay isProvisional')
        .sort({ preferredDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: appointments
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/appointments/:id
 * Retrieve a single appointment dossier.
 */
export async function getAppointmentById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid appointment ID format.' }
      });
    }

    const appointment = await Appointment.findById(id)
      .populate('customerId', 'fullName mobileNumber email city totalBookingsCount')
      .populate('vehicleId', 'brand model registrationNumberClean registrationNumberDisplay isProvisional')
      .populate('statusTimeline.changedBy', 'fullName role email')
      .lean();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/appointments/:id/status
 * Transition appointment status with timeline tracking and audit logging.
 */
export async function updateAppointmentStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid appointment ID format.' }
      });
    }

    const { status, reason, adminNotes } = req.body;
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status is required.' }
      });
    }

    const newStatus = status.trim().toUpperCase();
    if (!ALLOWED_APPOINTMENT_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid status. Allowed values: ${ALLOWED_APPOINTMENT_STATUSES.join(', ')}`
        }
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Appointment not found.' }
      });
    }

    const previousStatus = appointment.status;

    // Enforce valid lifecycle state transitions
    if (previousStatus !== newStatus) {
      const allowedNext = VALID_APPOINTMENT_TRANSITIONS[previousStatus] || [];
      if (!allowedNext.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition appointment status from "${previousStatus}" to "${newStatus}". Allowed transitions: ${allowedNext.join(', ') || 'None (Terminal state)'}.`
          }
        });
      }
    }

    // Update status and append timeline
    appointment.status = newStatus;
    appointment.statusTimeline.push({
      status: newStatus,
      changedBy: req.user._id,
      role: req.user.role,
      reason: reason ? String(reason).trim() : 'Operational status update',
      timestamp: new Date()
    });

    if (adminNotes !== undefined) {
      appointment.adminNotes = String(adminNotes).trim();
    }

    await appointment.save();

    // Create Audit Log
    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'APPOINTMENT_STATUS_UPDATED',
      entityType: 'Appointment',
      entityId: appointment._id,
      diff: {
        before: { status: previousStatus },
        after: { status: newStatus, reason: reason || null }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Appointment status updated from ${previousStatus} to ${newStatus}.`,
      data: {
        id: appointment._id,
        bookingReference: appointment.bookingReference,
        status: appointment.status,
        statusTimeline: appointment.statusTimeline,
        adminNotes: appointment.adminNotes
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// ENQUIRIES OPERATIONAL ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/enquiries
 * List customer enquiries with pagination and status filter.
 */
export async function listEnquiries(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status && typeof req.query.status === 'string') {
      const statusUpper = req.query.status.trim().toUpperCase();
      if (ALLOWED_ENQUIRY_STATUSES.includes(statusUpper)) {
        filter.status = statusUpper;
      }
    }

    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$or = [
        { ticketNumber: searchRegex },
        { customerName: searchRegex },
        { mobileNumber: searchRegex },
        { subject: searchRegex }
      ];
    }

    const [total, enquiries] = await Promise.all([
      Enquiry.countDocuments(filter),
      Enquiry.find(filter)
        .populate('customerId', 'fullName mobileNumber email')
        .populate('assignedTo', 'fullName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: enquiries
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/enquiries/:id
 * Retrieve a single enquiry ticket.
 */
export async function getEnquiryById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid enquiry ID format.' }
      });
    }

    const enquiry = await Enquiry.findById(id)
      .populate('customerId', 'fullName mobileNumber email totalBookingsCount')
      .populate('assignedTo', 'fullName role email')
      .lean();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Enquiry not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: enquiry
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/enquiries/:id/status
 * Transition enquiry status with notes and audit logging.
 */
export async function updateEnquiryStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid enquiry ID format.' }
      });
    }

    const { status, resolutionNotes, assignedTo } = req.body;
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status is required.' }
      });
    }

    const newStatus = status.trim().toUpperCase();
    if (!ALLOWED_ENQUIRY_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid status. Allowed values: ${ALLOWED_ENQUIRY_STATUSES.join(', ')}`
        }
      });
    }

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Enquiry not found.' }
      });
    }

    const previousStatus = enquiry.status;

    // Enforce valid lifecycle state transitions
    if (previousStatus !== newStatus) {
      const allowedNext = VALID_ENQUIRY_TRANSITIONS[previousStatus] || [];
      if (!allowedNext.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition enquiry status from "${previousStatus}" to "${newStatus}". Allowed transitions: ${allowedNext.join(', ') || 'None (Terminal state)'}.`
          }
        });
      }
    }

    enquiry.status = newStatus;

    if (newStatus === 'CONTACTED' && !enquiry.contactedAt) {
      enquiry.contactedAt = new Date();
    }
    if (newStatus === 'RESOLVED' && !enquiry.resolvedAt) {
      enquiry.resolvedAt = new Date();
    }

    if (resolutionNotes !== undefined) {
      enquiry.resolutionNotes = String(resolutionNotes).trim();
    }

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      enquiry.assignedTo = assignedTo;
    }

    await enquiry.save();

    // Create Audit Log
    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'ENQUIRY_STATUS_UPDATED',
      entityType: 'Enquiry',
      entityId: enquiry._id,
      diff: {
        before: { status: previousStatus },
        after: { status: newStatus, resolutionNotes: enquiry.resolutionNotes }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Enquiry status updated from ${previousStatus} to ${newStatus}.`,
      data: {
        id: enquiry._id,
        ticketNumber: enquiry.ticketNumber,
        status: enquiry.status,
        resolutionNotes: enquiry.resolutionNotes,
        contactedAt: enquiry.contactedAt,
        resolvedAt: enquiry.resolvedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// CUSTOMER OPERATIONAL ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/customers
 * List customers with pagination and search.
 */
export async function listCustomers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { mobileNumber: searchRegex },
        { email: searchRegex },
        { city: searchRegex }
      ];
    }

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter)
        .sort({ lastVisitDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: customers
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/customers/:id
 * Retrieve customer dossier with linked vehicles and booking history.
 */
export async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid customer ID format.' }
      });
    }

    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found.' }
      });
    }

    const [vehicles, appointments] = await Promise.all([
      Vehicle.find({ customerId: customer._id }).lean(),
      Appointment.find({ customerId: customer._id })
        .populate('vehicleId', 'brand model registrationNumberDisplay isProvisional')
        .sort({ preferredDate: -1, createdAt: -1 })
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...customer,
        vehicles,
        appointments
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/customers/:id
 * Update customer details with audit logging. Protects totalBookingsCount and enforces mobile uniqueness.
 */
export async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid customer ID format.' }
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found.' }
      });
    }

    const before = {
      fullName: customer.fullName,
      mobileNumber: customer.mobileNumber,
      email: customer.email,
      city: customer.city,
      address: customer.address,
      internalNotes: customer.internalNotes
    };

    const { fullName, mobileNumber, email, city, address, internalNotes } = req.body;

    if (fullName !== undefined) {
      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Customer name cannot be empty.' }
        });
      }
      customer.fullName = fullName.trim();
    }

    if (mobileNumber !== undefined) {
      const normalized = normalizeIndianPhone(mobileNumber);
      if (normalized !== customer.mobileNumber) {
        const conflict = await Customer.findOne({ mobileNumber: normalized, _id: { $ne: customer._id } });
        if (conflict) {
          return res.status(409).json({
            success: false,
            error: { code: 'MOBILE_EXISTS', message: 'Another customer is already registered with this mobile number.' }
          });
        }
        customer.mobileNumber = normalized;
      }
    }

    if (email !== undefined) customer.email = email ? String(email).trim().toLowerCase() : null;
    if (city !== undefined) customer.city = String(city).trim();
    if (address !== undefined) customer.address = String(address).trim();
    if (internalNotes !== undefined) customer.internalNotes = String(internalNotes).trim();

    await customer.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: customer._id,
      diff: {
        before,
        after: {
          fullName: customer.fullName,
          mobileNumber: customer.mobileNumber,
          email: customer.email,
          city: customer.city,
          address: customer.address,
          internalNotes: customer.internalNotes
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Customer record updated successfully.',
      data: customer
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// VEHICLE OPERATIONAL ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/vehicles
 * List registered vehicles with search, customer filtering, and provisional indicators.
 */
export async function listVehicles(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.customerId && mongoose.Types.ObjectId.isValid(req.query.customerId)) {
      filter.customerId = req.query.customerId;
    }
    if (req.query.isProvisional !== undefined) {
      filter.isProvisional = req.query.isProvisional === 'true';
    }
    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$or = [
        { registrationNumberClean: searchRegex },
        { registrationNumberDisplay: searchRegex },
        { brand: searchRegex },
        { model: searchRegex }
      ];
    }

    const [total, vehicles] = await Promise.all([
      Vehicle.countDocuments(filter),
      Vehicle.find(filter)
        .populate('customerId', 'fullName mobileNumber email')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: vehicles
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/vehicles/:id
 * Retrieve vehicle dossier with appointment service history.
 */
export async function getVehicleById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid vehicle ID format.' }
      });
    }

    const vehicle = await Vehicle.findById(id).populate('customerId', 'fullName mobileNumber email city').lean();
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found.' }
      });
    }

    const appointments = await Appointment.find({ vehicleId: vehicle._id })
      .populate('customerId', 'fullName mobileNumber')
      .sort({ preferredDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...vehicle,
        appointments
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/vehicles/:id
 * Update vehicle specifications, plate correction with conflict check,
 * and explicit audited customer ownership transfer workflow.
 */
export async function updateVehicle(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid vehicle ID format.' }
      });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found.' }
      });
    }

    const before = {
      brand: vehicle.brand,
      model: vehicle.model,
      registrationNumberClean: vehicle.registrationNumberClean,
      registrationNumberDisplay: vehicle.registrationNumberDisplay,
      customerId: vehicle.customerId,
      isProvisional: vehicle.isProvisional,
      fuelType: vehicle.fuelType,
      color: vehicle.color,
      manufacturingYear: vehicle.manufacturingYear,
      notes: vehicle.notes
    };

    const {
      brand,
      model,
      registrationNumber,
      fuelType,
      color,
      manufacturingYear,
      notes,
      customerId,
      confirmOwnershipTransfer,
      transferReason
    } = req.body;

    if (brand !== undefined) vehicle.brand = String(brand).trim();
    if (model !== undefined) vehicle.model = String(model).trim();
    if (fuelType !== undefined) vehicle.fuelType = fuelType;
    if (color !== undefined) vehicle.color = String(color).trim();
    if (manufacturingYear !== undefined) vehicle.manufacturingYear = Number(manufacturingYear) || null;
    if (notes !== undefined) vehicle.notes = String(notes).trim();

    // Plate update & conflict protection
    if (registrationNumber !== undefined) {
      const norm = normalizeRegistrationNumber(registrationNumber);
      if (norm.clean) {
        const conflict = await Vehicle.findOne({
          registrationNumberClean: norm.clean,
          _id: { $ne: vehicle._id }
        });
        if (conflict) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'REGISTRATION_EXISTS',
              message: `Registration number ${norm.display} is already assigned to another vehicle (ID: ${conflict._id}).`
            }
          });
        }
        vehicle.registrationNumberClean = norm.clean;
        vehicle.registrationNumberDisplay = norm.display;
        vehicle.isProvisional = false;
      } else if (registrationNumber === '' || registrationNumber === null) {
        vehicle.registrationNumberClean = null;
        vehicle.registrationNumberDisplay = null;
        vehicle.isProvisional = true;
      }
    }

    // Explicit, audited ownership transfer protection
    let ownershipTransferred = false;
    let sourceOwnerId = null;
    let targetCustomerId = null;
    if (customerId && customerId.toString() !== vehicle.customerId.toString()) {
      if (!confirmOwnershipTransfer || !transferReason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OWNERSHIP_TRANSFER_CONFIRMATION_REQUIRED',
            message: 'Reassigning a vehicle to another customer requires explicit confirmation (confirmOwnershipTransfer: true) and a valid transferReason.'
          }
        });
      }
      const targetCustomer = await Customer.findById(customerId);
      if (!targetCustomer) {
        return res.status(404).json({
          success: false,
          error: { code: 'TARGET_CUSTOMER_NOT_FOUND', message: 'Target customer for vehicle transfer does not exist.' }
        });
      }
      sourceOwnerId = vehicle.customerId;
      targetCustomerId = targetCustomer._id;
      vehicle.customerId = targetCustomer._id;
      ownershipTransferred = true;
    }

    await vehicle.save();

    const action = ownershipTransferred ? 'VEHICLE_OWNERSHIP_TRANSFERRED' : 'VEHICLE_UPDATED';

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action,
      entityType: 'Vehicle',
      entityId: vehicle._id,
      diff: {
        before,
        after: {
          brand: vehicle.brand,
          model: vehicle.model,
          registrationNumberClean: vehicle.registrationNumberClean,
          registrationNumberDisplay: vehicle.registrationNumberDisplay,
          customerId: vehicle.customerId,
          isProvisional: vehicle.isProvisional,
          fuelType: vehicle.fuelType,
          color: vehicle.color,
          sourceOwner: sourceOwnerId,
          destinationOwner: targetCustomerId,
          transferReason: ownershipTransferred ? transferReason : null
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: ownershipTransferred
        ? 'Vehicle ownership transferred successfully.'
        : 'Vehicle details updated successfully.',
      data: vehicle
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/vehicles/:id/transfer-owner
 * Explicit audited vehicle ownership transfer endpoint with ACID transaction safety on Atlas.
 */
export async function transferVehicleOwner(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid vehicle ID format.' }
      });
    }

    const { customerId, confirmOwnershipTransfer, transferReason } = req.body || {};

    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CUSTOMER_ID', message: 'A valid target customer ID is required.' }
      });
    }

    if (confirmOwnershipTransfer !== true || !transferReason || typeof transferReason !== 'string' || !transferReason.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OWNERSHIP_TRANSFER_CONFIRMATION_REQUIRED',
          message: 'Reassigning a vehicle requires explicit confirmation (confirmOwnershipTransfer: true) and a valid transferReason.'
        }
      });
    }

    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        let savedVehicle = null;
        await session.withTransaction(async () => {
          const vehicle = await Vehicle.findById(id).session(session);
          if (!vehicle) {
            const err = new Error('Vehicle not found.');
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
          }

          if (vehicle.customerId.toString() === customerId.toString()) {
            const err = new Error('Vehicle is already registered to this customer.');
            err.statusCode = 400;
            err.code = 'SAME_OWNER';
            throw err;
          }

          const targetCustomer = await Customer.findById(customerId).session(session);
          if (!targetCustomer) {
            const err = new Error('Target destination customer for vehicle transfer does not exist.');
            err.statusCode = 404;
            err.code = 'TARGET_CUSTOMER_NOT_FOUND';
            throw err;
          }

          const previousOwnerId = vehicle.customerId;
          vehicle.customerId = targetCustomer._id;
          await vehicle.save({ session });
          savedVehicle = vehicle;

          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'VEHICLE_OWNERSHIP_TRANSFERRED',
            entityType: 'Vehicle',
            entityId: vehicle._id,
            diff: {
              sourceOwner: previousOwnerId,
              destinationOwner: targetCustomer._id,
              transferReason: transferReason.trim(),
              registrationNumber: vehicle.registrationNumberDisplay || vehicle.registrationNumberClean || 'PROVISIONAL'
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });

        return res.status(200).json({
          success: true,
          message: 'Vehicle ownership transferred successfully.',
          data: savedVehicle
        });
      } finally {
        await session.endSession();
      }
    } else {
      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vehicle not found.' }
        });
      }

      if (vehicle.customerId.toString() === customerId.toString()) {
        return res.status(400).json({
          success: false,
          error: { code: 'SAME_OWNER', message: 'Vehicle is already registered to this customer.' }
        });
      }

      const targetCustomer = await Customer.findById(customerId);
      if (!targetCustomer) {
        return res.status(404).json({
          success: false,
          error: { code: 'TARGET_CUSTOMER_NOT_FOUND', message: 'Target destination customer for vehicle transfer does not exist.' }
        });
      }

      const previousOwnerId = vehicle.customerId;
      vehicle.customerId = targetCustomer._id;
      await vehicle.save();

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'VEHICLE_OWNERSHIP_TRANSFERRED',
        entityType: 'Vehicle',
        entityId: vehicle._id,
        diff: {
          sourceOwner: previousOwnerId,
          destinationOwner: targetCustomer._id,
          transferReason: transferReason.trim(),
          registrationNumber: vehicle.registrationNumberDisplay || vehicle.registrationNumberClean || 'PROVISIONAL'
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });

      return res.status(200).json({
        success: true,
        message: 'Vehicle ownership transferred successfully.',
        data: vehicle
      });
    }
  } catch (err) {
    next(err);
  }
}

// ==========================================
// SERVICE MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/services
 * List all services (active and inactive).
 */
export async function listServices(req, res, next) {
  try {
    const services = await Service.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: services
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/services
 * Create a new workshop service.
 */
export async function createService(req, res, next) {
  try {
    const {
      title,
      slug,
      shortDesc,
      fullDesc,
      priceDisplay,
      basePrice,
      category,
      timeEstimate,
      image,
      tag,
      icon,
      highlights,
      isPopular,
      isCoreService,
      isActive,
      sortOrder
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Service title is required.' }
      });
    }

    if (image && !isValidMediaUrl(image)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MEDIA_URL', message: 'Service image must be a valid HTTP/HTTPS URL or local path. Dangerous schemes are prohibited.' }
      });
    }

    const calculatedSlug = slug && typeof slug === 'string' && slug.trim()
      ? slugify(slug)
      : slugify(title);

    const existingSlug = await Service.findOne({ slug: calculatedSlug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        error: { code: 'SLUG_EXISTS', message: `Service with slug "${calculatedSlug}" already exists.` }
      });
    }

    const service = new Service({
      title: title.trim(),
      slug: calculatedSlug,
      shortDesc: shortDesc ? String(shortDesc).trim() : '',
      fullDesc: fullDesc ? String(fullDesc).trim() : '',
      priceDisplay: priceDisplay ? String(priceDisplay).trim() : 'Contact for Quote',
      basePrice: Number(basePrice) || 0,
      category: category ? String(category).trim() : 'General',
      timeEstimate: timeEstimate ? String(timeEstimate).trim() : '1 - 2 Hours',
      image: image ? String(image).trim() : '/assets/services/general-service.jpg',
      tag: tag ? String(tag).trim() : '',
      icon: icon ? String(icon).trim() : 'Wrench',
      highlights: Array.isArray(highlights) ? highlights.map(String) : [],
      isPopular: Boolean(isPopular),
      isCoreService: Boolean(isCoreService),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      sortOrder: Number(sortOrder) || 0
    });

    await service.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SERVICE_CREATED',
      entityType: 'Service',
      entityId: service._id,
      diff: { before: null, after: service.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: service
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/services/:id
 * Update an existing service.
 */
export async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid service ID format.' }
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found.' }
      });
    }

    const before = service.toObject();

    const {
      title,
      slug,
      shortDesc,
      fullDesc,
      priceDisplay,
      basePrice,
      category,
      timeEstimate,
      image,
      tag,
      icon,
      highlights,
      isPopular,
      isCoreService,
      isActive,
      sortOrder
    } = req.body;

    if (title !== undefined) service.title = String(title).trim();
    if (slug !== undefined) {
      const cleanSlug = slugify(slug);
      const conflict = await Service.findOne({ slug: cleanSlug, _id: { $ne: service._id } });
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: { code: 'SLUG_EXISTS', message: `Slug "${cleanSlug}" is already in use by another service.` }
        });
      }
      service.slug = cleanSlug;
    }
    if (shortDesc !== undefined) service.shortDesc = String(shortDesc).trim();
    if (fullDesc !== undefined) service.fullDesc = String(fullDesc).trim();
    if (priceDisplay !== undefined) service.priceDisplay = String(priceDisplay).trim();
    if (basePrice !== undefined) service.basePrice = Number(basePrice) || 0;
    if (category !== undefined) service.category = String(category).trim();
    if (timeEstimate !== undefined) service.timeEstimate = String(timeEstimate).trim();
    if (image !== undefined && image) {
      if (!isValidMediaUrl(image)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_MEDIA_URL', message: 'Service image must be a valid HTTP/HTTPS URL or local path. Dangerous schemes are prohibited.' }
        });
      }
      service.image = String(image).trim();
    }
    if (tag !== undefined) service.tag = String(tag).trim();
    if (icon !== undefined) service.icon = String(icon).trim();
    if (highlights !== undefined && Array.isArray(highlights)) service.highlights = highlights.map(String);
    if (isPopular !== undefined) service.isPopular = Boolean(isPopular);
    if (isCoreService !== undefined) service.isCoreService = Boolean(isCoreService);
    if (isActive !== undefined) service.isActive = Boolean(isActive);
    if (sortOrder !== undefined) service.sortOrder = Number(sortOrder) || 0;

    await service.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SERVICE_UPDATED',
      entityType: 'Service',
      entityId: service._id,
      diff: { before, after: service.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: service
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/services/:id/toggle
 * Activate or deactivate a service catalog entry.
 */
export async function toggleServiceStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid service ID format.' }
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found.' }
      });
    }

    const previousStatus = service.isActive;
    service.isActive = !previousStatus;
    await service.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SERVICE_STATUS_TOGGLED',
      entityType: 'Service',
      entityId: service._id,
      diff: {
        before: { isActive: previousStatus },
        after: { isActive: service.isActive }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: {
        id: service._id,
        title: service.title,
        isActive: service.isActive
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// GALLERY OPERATIONAL ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/gallery
 * List all gallery media entries.
 */
export async function listGallery(req, res, next) {
  try {
    const items = await GalleryItem.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/gallery
 * Add an image or video to the workshop gallery.
 */
export async function createGalleryItem(req, res, next) {
  try {
    const {
      title,
      category,
      image,
      description,
      type,
      videoUrl,
      badge,
      sortOrder,
      isActive
    } = req.body;

    if (!title || !category || !image) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title, category, and image URL are required.' }
      });
    }

    if (!isValidMediaUrl(image)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MEDIA_URL', message: 'Gallery image must be a valid HTTP/HTTPS URL or local path. Dangerous schemes are prohibited.' }
      });
    }

    if (videoUrl && !isValidMediaUrl(videoUrl)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MEDIA_URL', message: 'Video URL must be a valid HTTP/HTTPS URL or local path.' }
      });
    }

    const item = new GalleryItem({
      title: String(title).trim(),
      category: String(category).trim(),
      image: String(image).trim(),
      description: description ? String(description).trim() : '',
      type: type === 'video' ? 'video' : 'image',
      videoUrl: videoUrl ? String(videoUrl).trim() : '',
      badge: badge ? String(badge).trim() : '',
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    await item.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'GALLERY_ITEM_CREATED',
      entityType: 'GalleryItem',
      entityId: item._id,
      diff: { before: null, after: item.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: 'Gallery item created successfully.',
      data: item
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/gallery/:id
 * Update gallery entry details.
 */
export async function updateGalleryItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid gallery item ID format.' }
      });
    }

    const item = await GalleryItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery item not found.' }
      });
    }

    const before = item.toObject();

    const {
      title,
      category,
      image,
      description,
      type,
      videoUrl,
      badge,
      sortOrder,
      isActive
    } = req.body;

    if (title !== undefined) item.title = String(title).trim();
    if (category !== undefined) item.category = String(category).trim();
    if (image !== undefined) {
      if (!isValidMediaUrl(image)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_MEDIA_URL', message: 'Gallery image must be a valid HTTP/HTTPS URL or local path. Dangerous schemes are prohibited.' }
        });
      }
      item.image = String(image).trim();
    }
    if (description !== undefined) item.description = String(description).trim();
    if (type !== undefined) item.type = type === 'video' ? 'video' : 'image';
    if (videoUrl !== undefined && videoUrl) {
      if (!isValidMediaUrl(videoUrl)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_MEDIA_URL', message: 'Video URL must be a valid HTTP/HTTPS URL or local path.' }
        });
      }
      item.videoUrl = String(videoUrl).trim();
    }
    if (badge !== undefined) item.badge = String(badge).trim();
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) item.isActive = Boolean(isActive);

    await item.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'GALLERY_ITEM_UPDATED',
      entityType: 'GalleryItem',
      entityId: item._id,
      diff: { before, after: item.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Gallery item updated successfully.',
      data: item
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/gallery/:id
 * Delete a gallery entry safely.
 */
export async function deleteGalleryItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid gallery item ID format.' }
      });
    }

    const item = await GalleryItem.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gallery item not found.' }
      });
    }

    const before = item.toObject();
    await GalleryItem.findByIdAndDelete(id);

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'GALLERY_ITEM_DELETED',
      entityType: 'GalleryItem',
      entityId: id,
      diff: { before, after: null },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// REVIEW MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/reviews
 * List all customer reviews.
 */
export async function listReviews(req, res, next) {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/reviews
 * Add a genuine customer review.
 */
export async function createReview(req, res, next) {
  try {
    const {
      customerName,
      carModel,
      serviceTaken,
      rating,
      comment,
      reviewDate,
      verified,
      source,
      isActive
    } = req.body;

    if (!customerName || !comment) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Customer name and review comment are required.' }
      });
    }

    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const review = new Review({
      customerName: String(customerName).trim(),
      carModel: carModel ? String(carModel).trim() : '',
      serviceTaken: serviceTaken ? String(serviceTaken).trim() : '',
      rating: numRating,
      comment: String(comment).trim(),
      reviewDate: reviewDate ? String(reviewDate).trim() : 'Recently',
      verified: verified !== undefined ? Boolean(verified) : true,
      source: source ? String(source).trim() : 'Google Verified',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    await review.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'REVIEW_CREATED',
      entityType: 'Review',
      entityId: review._id,
      diff: { before: null, after: review.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(201).json({
      success: true,
      message: 'Review created successfully.',
      data: review
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/reviews/:id
 * Update an existing review.
 */
export async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid review ID format.' }
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found.' }
      });
    }

    const before = review.toObject();

    const {
      customerName,
      carModel,
      serviceTaken,
      rating,
      comment,
      reviewDate,
      verified,
      source,
      isActive
    } = req.body;

    if (customerName !== undefined) review.customerName = String(customerName).trim();
    if (carModel !== undefined) review.carModel = String(carModel).trim();
    if (serviceTaken !== undefined) review.serviceTaken = String(serviceTaken).trim();
    if (rating !== undefined) review.rating = Math.min(5, Math.max(1, Number(rating) || 5));
    if (comment !== undefined) review.comment = String(comment).trim();
    if (reviewDate !== undefined) review.reviewDate = String(reviewDate).trim();
    if (verified !== undefined) review.verified = Boolean(verified);
    if (source !== undefined) review.source = String(source).trim();
    if (isActive !== undefined) review.isActive = Boolean(isActive);

    await review.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'REVIEW_UPDATED',
      entityType: 'Review',
      entityId: review._id,
      diff: { before, after: review.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      data: review
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/reviews/:id/toggle
 * Toggle review visibility or verification status.
 */
export async function toggleReviewStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid review ID format.' }
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found.' }
      });
    }

    const { field } = req.body; // 'isActive' or 'verified'
    const targetField = field === 'verified' ? 'verified' : 'isActive';
    const previous = review[targetField];
    review[targetField] = !previous;
    await review.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'REVIEW_STATUS_TOGGLED',
      entityType: 'Review',
      entityId: review._id,
      diff: {
        before: { [targetField]: previous },
        after: { [targetField]: review[targetField] }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Review ${targetField} updated to ${review[targetField]}.`,
      data: review
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/reviews/:id
 * Delete a review entry safely.
 */
export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid review ID format.' }
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found.' }
      });
    }

    const before = review.toObject();
    await Review.findByIdAndDelete(id);

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'REVIEW_DELETED',
      entityType: 'Review',
      entityId: id,
      diff: { before, after: null },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// BUSINESS SETTINGS OPERATIONAL ENDPOINTS
// ==========================================

/**
 * GET /api/v1/admin/settings
 * Retrieve operational garage settings.
 */
export async function getBusinessSettings(req, res, next) {
  try {
    let settings = await BusinessSetting.findOne({ singletonKey: 'singleton' }).lean();
    if (!settings) {
      const created = await BusinessSetting.create({ singletonKey: 'singleton' });
      settings = created.toObject();
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/settings
 * Update operational garage settings with audit logging.
 */
export async function updateBusinessSettings(req, res, next) {
  try {
    let settings = await BusinessSetting.findOne({ singletonKey: 'singleton' });
    if (!settings) {
      settings = new BusinessSetting({ singletonKey: 'singleton' });
    }

    const before = settings.toObject();
    const { business, contact, stats } = req.body;

    if (business && typeof business === 'object') {
      settings.business = {
        ...settings.business.toObject(),
        ...business
      };
    }

    if (contact && typeof contact === 'object') {
      settings.contact = {
        ...settings.contact.toObject(),
        ...contact
      };
    }

    if (stats && Array.isArray(stats)) {
      settings.stats = stats;
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'SETTINGS_UPDATED',
      entityType: 'BusinessSetting',
      entityId: settings._id,
      diff: { before, after: settings.toObject() },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Business settings updated successfully.',
      data: settings
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// AUDIT LOGS ENDPOINTS (OWNER ONLY)
// ==========================================

/**
 * GET /api/v1/admin/audit-logs
 * List append-only audit trail. STRICTLY OWNER ONLY.
 */
export async function listAuditLogs(req, res, next) {
  try {
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access restricted to OWNER role.'
        }
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action && typeof req.query.action === 'string') {
      filter.action = req.query.action.trim().toUpperCase();
    }
    if (req.query.entityType && typeof req.query.entityType === 'string') {
      filter.entityType = req.query.entityType.trim();
    }
    if (req.query.actorRole && typeof req.query.actorRole === 'string') {
      filter.actorRole = req.query.actorRole.trim().toUpperCase();
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (err) {
    next(err);
  }
}

// Re-export Job Card operational controllers
export {
  listJobCards,
  createJobCard,
  getJobCardById,
  updateJobCard,
  updateJobCardStatus,
  getJobCardByAppointmentId
} from './jobCardController.js';
