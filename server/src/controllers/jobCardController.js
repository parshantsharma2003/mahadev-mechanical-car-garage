import mongoose from 'mongoose';
import { JobCard, JOB_CARD_STATUSES, VALID_JOB_CARD_TRANSITIONS } from '../models/JobCard.js';
import { ServiceEstimate } from '../models/ServiceEstimate.js';
import { Appointment } from '../models/Appointment.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { createAuditRecord } from '../services/auditService.js';
import { isTransactionSupported } from '../config/db.js';

function escapeRegex(text) {
  return String(text || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates a unique sequential Job Card number in the format JC-YYYYMMDD-XXXX
 */
async function generateJobCardNumber(session = null) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `JC-${dateStr}-`;

  const query = JobCard.findOne({ jobCardNumber: new RegExp(`^${prefix}`) })
    .sort({ jobCardNumber: -1 })
    .select('jobCardNumber');

  if (session) {
    query.session(session);
  }

  const latest = await query.lean();
  let nextSeq = 1;
  if (latest && latest.jobCardNumber) {
    const parts = latest.jobCardNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// ==========================================
// 1. LIST JOB CARDS (GET /job-cards)
// ==========================================
export async function listJobCards(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, search, dateFrom, dateTo, customerId, vehicleId } = req.query;
    const filter = {};

    if (status && JOB_CARD_STATUSES.includes(status.trim().toUpperCase())) {
      filter.status = status.trim().toUpperCase();
    }

    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { jobCardNumber: { $regex: escaped, $options: 'i' } },
        { 'customerSnapshot.fullName': { $regex: escaped, $options: 'i' } },
        { 'customerSnapshot.mobileNumber': { $regex: escaped, $options: 'i' } },
        { 'vehicleSnapshot.registrationNumber': { $regex: escaped, $options: 'i' } }
      ];
    }

    if (dateFrom || dateTo) {
      filter.receivedAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          filter.receivedAt.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.receivedAt.$lte = toDate;
        }
      }
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
      filter.vehicleId = vehicleId;
    }

    const [total, jobCards] = await Promise.all([
      JobCard.countDocuments(filter),
      JobCard.find(filter)
        .sort({ receivedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'fullName mobileNumber email city')
        .populate('vehicleId', 'brand model registrationNumberDisplay registrationNumberClean fuelType')
        .populate('appointmentId', 'bookingReference preferredDate preferredTimeSlot')
        .populate('createdBy', 'fullName role')
    ]);

    return res.status(200).json({
      success: true,
      data: jobCards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 2. CREATE JOB CARD (POST /job-cards)
// ==========================================
export async function createJobCard(req, res, next) {
  try {
    const {
      appointmentId,
      customerId,
      vehicleId,
      odometerReading = 0,
      fuelLevel = 'QUARTER',
      vehicleCondition,
      inspectionNotes = '',
      estimatedDeliveryAt,
      internalNotes = '',
      customerComplaint,
      requestedServices
    } = req.body;

    let targetCustomerId = customerId;
    let targetVehicleId = vehicleId;
    let appointmentDoc = null;

    // A) If creating from Appointment
    if (appointmentId) {
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Invalid appointment ID format.' }
        });
      }

      appointmentDoc = await Appointment.findById(appointmentId);
      if (!appointmentDoc) {
        return res.status(404).json({
          success: false,
          error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found.' }
        });
      }

      // Rule: Prevent duplicate Job Cards for the same appointment
      const existingJobCard = await JobCard.findOne({ appointmentId: appointmentDoc._id });
      if (existingJobCard) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_JOB_CARD',
            message: `A Job Card (${existingJobCard.jobCardNumber}) already exists for this appointment.`
          }
        });
      }

      // Rule: Only a CONFIRMED appointment can be converted into a Job Card
      if (appointmentDoc.status !== 'CONFIRMED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'APPOINTMENT_NOT_CONFIRMED',
            message: `Cannot convert appointment with status "${appointmentDoc.status}". Only CONFIRMED appointments can be converted into Job Cards.`
          }
        });
      }

      targetCustomerId = appointmentDoc.customerId;
      targetVehicleId = vehicleId || appointmentDoc.vehicleId;
    }

    // Validate Customer ID
    if (!targetCustomerId || !mongoose.Types.ObjectId.isValid(targetCustomerId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'CUSTOMER_REQUIRED', message: 'A valid customer ID is required.' }
      });
    }

    // Validate Vehicle ID
    if (!targetVehicleId || !mongoose.Types.ObjectId.isValid(targetVehicleId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VEHICLE_REQUIRED', message: 'A valid vehicle ID is required.' }
      });
    }

    // Fetch and validate Customer
    const customer = await Customer.findById(targetCustomerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer record not found.' }
      });
    }

    // Fetch and validate Vehicle
    const vehicle = await Vehicle.findById(targetVehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle record not found.' }
      });
    }

    // Rule: Never silently transfer vehicle ownership
    if (vehicle.customerId.toString() !== customer._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VEHICLE_OWNER_MISMATCH',
          message: 'The selected vehicle does not belong to the specified customer.'
        }
      });
    }

    // Validate odometer reading
    const parsedOdometer = Number(odometerReading);
    if (isNaN(parsedOdometer) || parsedOdometer < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ODOMETER', message: 'Odometer reading must be a non-negative number.' }
      });
    }

    // Validate fuel level
    const allowedFuelLevels = ['EMPTY', 'RESERVE', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL'];
    if (fuelLevel && !allowedFuelLevels.includes(fuelLevel)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FUEL_LEVEL',
          message: `Invalid fuel level. Allowed: ${allowedFuelLevels.join(', ')}`
        }
      });
    }

    // Build historical snapshots
    const customerSnapshot = {
      fullName: customer.fullName,
      mobileNumber: customer.mobileNumber,
      email: customer.email || '',
      city: customer.city || 'Gohana',
      address: customer.address || ''
    };

    const vehicleSnapshot = {
      brand: vehicle.brand,
      model: vehicle.model,
      registrationNumber:
        vehicle.registrationNumberDisplay || vehicle.registrationNumberClean || 'PROVISIONAL',
      fuelType: vehicle.fuelType || 'OTHER',
      manufacturingYear: vehicle.manufacturingYear || null,
      color: vehicle.color || ''
    };

    // Build services
    let servicesToSave = [];
    if (Array.isArray(requestedServices) && requestedServices.length > 0) {
      servicesToSave = requestedServices.map((s) => ({
        serviceId: s.serviceId && mongoose.Types.ObjectId.isValid(s.serviceId) ? s.serviceId : undefined,
        name: String(s.name || s.title || 'General Service').trim(),
        category: s.category || 'General',
        price: Number(s.price) || 0,
        priceDisplay: s.priceDisplay || ''
      }));
    } else if (appointmentDoc && Array.isArray(appointmentDoc.services)) {
      servicesToSave = appointmentDoc.services.map((s) => ({
        serviceId: s.serviceId,
        name: s.title,
        category: 'General',
        price: 0,
        priceDisplay: s.priceDisplay || ''
      }));
    }

    // Customer complaint
    const finalComplaint =
      customerComplaint !== undefined
        ? String(customerComplaint).trim()
        : appointmentDoc?.problemDescription || '';

    // Parsed estimated delivery date
    let parsedEstimatedDelivery = null;
    if (estimatedDeliveryAt) {
      const d = new Date(estimatedDeliveryAt);
      if (!isNaN(d.getTime())) {
        parsedEstimatedDelivery = d;
      }
    }

    const supportsTxn = await isTransactionSupported();

    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        let createdJobCard = null;

        await session.withTransaction(async () => {
          // Re-check appointment within transaction if present
          if (appointmentDoc) {
            const freshAppt = await Appointment.findById(appointmentDoc._id).session(session);
            if (!freshAppt || freshAppt.status !== 'CONFIRMED') {
              const err = new Error('Appointment status is no longer confirmed.');
              err.statusCode = 400;
              err.code = 'APPOINTMENT_NOT_CONFIRMED';
              throw err;
            }

            const existingInTxn = await JobCard.findOne({ appointmentId: freshAppt._id }).session(session);
            if (existingInTxn) {
              const err = new Error(`Job Card already exists for appointment.`);
              err.statusCode = 409;
              err.code = 'DUPLICATE_JOB_CARD';
              throw err;
            }
          }

          let savedDoc = null;
          let attempts = 0;

          while (!savedDoc && attempts < 5) {
            attempts++;
            const jobCardNumber = await generateJobCardNumber(session);

            const jobCardInstance = new JobCard({
              jobCardNumber,
              customerId: customer._id,
              vehicleId: vehicle._id,
              appointmentId: appointmentDoc ? appointmentDoc._id : null,
              customerSnapshot,
              vehicleSnapshot,
              requestedServices: servicesToSave,
              customerComplaint: finalComplaint,
              odometerReading: parsedOdometer,
              fuelLevel,
              vehicleCondition: vehicleCondition || {
                exteriorNotes: '',
                hasSpareWheel: true,
                hasJack: true,
                hasToolKit: true,
                scratches: []
              },
              inspectionNotes: String(inspectionNotes || '').trim(),
              receivedAt: new Date(),
              estimatedDeliveryAt: parsedEstimatedDelivery,
              status: 'CREATED',
              statusTimeline: [
                {
                  status: 'CREATED',
                  changedBy: req.user._id,
                  role: req.user.role,
                  notes: appointmentDoc
                    ? `Job Card created from confirmed appointment ${appointmentDoc.bookingReference}`
                    : 'Direct workshop walk-in Job Card created',
                  timestamp: new Date()
                }
              ],
              internalNotes: String(internalNotes || '').trim(),
              createdBy: req.user._id,
              updatedBy: req.user._id
            });

            try {
              await jobCardInstance.save({ session });
              savedDoc = jobCardInstance;
            } catch (saveErr) {
              if (saveErr.code === 11000 && saveErr.keyPattern?.jobCardNumber && attempts < 5) {
                continue;
              }
              throw saveErr;
            }
          }

          createdJobCard = savedDoc;

          // If converting appointment: update appointment status to IN_PROGRESS
          if (appointmentDoc) {
            const apptToUpdate = await Appointment.findById(appointmentDoc._id).session(session);
            if (apptToUpdate) {
              apptToUpdate.status = 'IN_PROGRESS';
              apptToUpdate.statusTimeline.push({
                status: 'IN_PROGRESS',
                changedBy: req.user._id,
                role: req.user.role,
                reason: `Converted to Job Card ${createdJobCard.jobCardNumber}`,
                timestamp: new Date()
              });
              await apptToUpdate.save({ session });
            }
          }

          // Update customer last visit date
          customer.lastVisitDate = new Date();
          await customer.save({ session });

          // Create AuditLog
          await createAuditRecord({
            actorId: req.user._id,
            actorRole: req.user.role,
            actorName: req.user.fullName,
            action: 'JOB_CARD_CREATED',
            entityType: 'JobCard',
            entityId: createdJobCard._id,
            diff: {
              before: null,
              after: {
                jobCardNumber: createdJobCard.jobCardNumber,
                appointmentId: appointmentDoc ? appointmentDoc._id : null,
                customerId: customer._id,
                vehicleId: vehicle._id,
                status: 'CREATED'
              }
            },
            ipAddress: req.ip || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'admin-api'
          });
        });

        return res.status(201).json({
          success: true,
          message: `Job Card ${createdJobCard.jobCardNumber} created successfully.`,
          data: createdJobCard
        });
      } finally {
        await session.endSession();
      }
    } else {
      // Safe fallback for standalone MongoDB instances
      let savedDoc = null;
      let attempts = 0;

      while (!savedDoc && attempts < 5) {
        attempts++;
        const jobCardNumber = await generateJobCardNumber(null);

        const jobCardInstance = new JobCard({
          jobCardNumber,
          customerId: customer._id,
          vehicleId: vehicle._id,
          appointmentId: appointmentDoc ? appointmentDoc._id : null,
          customerSnapshot,
          vehicleSnapshot,
          requestedServices: servicesToSave,
          customerComplaint: finalComplaint,
          odometerReading: parsedOdometer,
          fuelLevel,
          vehicleCondition: vehicleCondition || {
            exteriorNotes: '',
            hasSpareWheel: true,
            hasJack: true,
            hasToolKit: true,
            scratches: []
          },
          inspectionNotes: String(inspectionNotes || '').trim(),
          receivedAt: new Date(),
          estimatedDeliveryAt: parsedEstimatedDelivery,
          status: 'CREATED',
          statusTimeline: [
            {
              status: 'CREATED',
              changedBy: req.user._id,
              role: req.user.role,
              notes: appointmentDoc
                ? `Job Card created from confirmed appointment ${appointmentDoc.bookingReference}`
                : 'Direct workshop walk-in Job Card created',
              timestamp: new Date()
            }
          ],
          internalNotes: String(internalNotes || '').trim(),
          createdBy: req.user._id,
          updatedBy: req.user._id
        });

        try {
          await jobCardInstance.save();
          savedDoc = jobCardInstance;
        } catch (saveErr) {
          if (saveErr.code === 11000 && saveErr.keyPattern?.jobCardNumber && attempts < 5) {
            continue;
          }
          throw saveErr;
        }
      }

      // If converting appointment: update appointment status to IN_PROGRESS
      if (appointmentDoc) {
        appointmentDoc.status = 'IN_PROGRESS';
        appointmentDoc.statusTimeline.push({
          status: 'IN_PROGRESS',
          changedBy: req.user._id,
          role: req.user.role,
          reason: `Converted to Job Card ${savedDoc.jobCardNumber}`,
          timestamp: new Date()
        });
        await appointmentDoc.save();
      }

      customer.lastVisitDate = new Date();
      await customer.save();

      await createAuditRecord({
        actorId: req.user._id,
        actorRole: req.user.role,
        actorName: req.user.fullName,
        action: 'JOB_CARD_CREATED',
        entityType: 'JobCard',
        entityId: savedDoc._id,
        diff: {
          before: null,
          after: {
            jobCardNumber: savedDoc.jobCardNumber,
            appointmentId: appointmentDoc ? appointmentDoc._id : null,
            customerId: customer._id,
            vehicleId: vehicle._id,
            status: 'CREATED'
          }
        },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-api'
      });

      return res.status(201).json({
        success: true,
        message: `Job Card ${savedDoc.jobCardNumber} created successfully.`,
        data: savedDoc
      });
    }
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 3. GET JOB CARD BY ID (GET /job-cards/:id)
// ==========================================
export async function getJobCardById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Job Card ID format.' }
      });
    }

    const jobCard = await JobCard.findById(id)
      .populate('customerId')
      .populate('vehicleId')
      .populate('appointmentId')
      .populate('createdBy', 'fullName role email')
      .populate('updatedBy', 'fullName role email');

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job Card not found.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: jobCard
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 4. UPDATE JOB CARD DETAILS (PATCH /job-cards/:id)
// ==========================================
export async function updateJobCard(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Job Card ID format.' }
      });
    }

    const jobCard = await JobCard.findById(id);
    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job Card not found.' }
      });
    }

    const beforeSnapshot = {
      odometerReading: jobCard.odometerReading,
      fuelLevel: jobCard.fuelLevel,
      vehicleCondition: jobCard.vehicleCondition,
      inspectionNotes: jobCard.inspectionNotes,
      estimatedDeliveryAt: jobCard.estimatedDeliveryAt,
      internalNotes: jobCard.internalNotes,
      customerComplaint: jobCard.customerComplaint
    };

    const {
      odometerReading,
      fuelLevel,
      vehicleCondition,
      inspectionNotes,
      estimatedDeliveryAt,
      internalNotes,
      customerComplaint,
      requestedServices
    } = req.body;

    if (odometerReading !== undefined) {
      const odo = Number(odometerReading);
      if (isNaN(odo) || odo < 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ODOMETER', message: 'Odometer reading must be a non-negative number.' }
        });
      }
      jobCard.odometerReading = odo;
    }

    if (fuelLevel !== undefined) {
      const allowed = ['EMPTY', 'RESERVE', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL'];
      if (!allowed.includes(fuelLevel)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FUEL_LEVEL', message: `Fuel level must be one of: ${allowed.join(', ')}` }
        });
      }
      jobCard.fuelLevel = fuelLevel;
    }

    if (vehicleCondition !== undefined) {
      jobCard.vehicleCondition = {
        ...jobCard.vehicleCondition,
        ...vehicleCondition
      };
    }

    if (inspectionNotes !== undefined) {
      jobCard.inspectionNotes = String(inspectionNotes).trim();
    }

    if (estimatedDeliveryAt !== undefined) {
      if (estimatedDeliveryAt === null || estimatedDeliveryAt === '') {
        jobCard.estimatedDeliveryAt = null;
      } else {
        const d = new Date(estimatedDeliveryAt);
        if (!isNaN(d.getTime())) {
          jobCard.estimatedDeliveryAt = d;
        }
      }
    }

    if (internalNotes !== undefined) {
      jobCard.internalNotes = String(internalNotes).trim();
    }

    if (customerComplaint !== undefined) {
      jobCard.customerComplaint = String(customerComplaint).trim();
    }

    if (Array.isArray(requestedServices)) {
      jobCard.requestedServices = requestedServices.map((s) => ({
        serviceId: s.serviceId && mongoose.Types.ObjectId.isValid(s.serviceId) ? s.serviceId : undefined,
        name: String(s.name || s.title || 'General Service').trim(),
        category: s.category || 'General',
        price: Number(s.price) || 0,
        priceDisplay: s.priceDisplay || ''
      }));
    }

    jobCard.updatedBy = req.user._id;
    await jobCard.save();

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'JOB_CARD_UPDATED',
      entityType: 'JobCard',
      entityId: jobCard._id,
      diff: {
        before: beforeSnapshot,
        after: {
          odometerReading: jobCard.odometerReading,
          fuelLevel: jobCard.fuelLevel,
          vehicleCondition: jobCard.vehicleCondition,
          inspectionNotes: jobCard.inspectionNotes,
          estimatedDeliveryAt: jobCard.estimatedDeliveryAt,
          internalNotes: jobCard.internalNotes,
          customerComplaint: jobCard.customerComplaint
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: 'Job Card updated successfully.',
      data: jobCard
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 5. UPDATE JOB CARD STATUS (PATCH /job-cards/:id/status)
// ==========================================
export async function updateJobCardStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid Job Card ID format.' }
      });
    }

    const { status, notes } = req.body;
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status is required.' }
      });
    }

    const newStatus = status.trim().toUpperCase();
    if (!JOB_CARD_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid status. Allowed values: ${JOB_CARD_STATUSES.join(', ')}`
        }
      });
    }

    const jobCard = await JobCard.findById(id);
    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job Card not found.' }
      });
    }

    const previousStatus = jobCard.status;

    // Strict finite-state transition validation
    const allowedTransitions = VALID_JOB_CARD_TRANSITIONS[previousStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition Job Card status from "${previousStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ') || 'None (Terminal state)'}.`
        }
      });
    }

    // Section 6: IN_PROGRESS requires an approved estimate or OWNER-authorized exception
    if (newStatus === 'IN_PROGRESS') {
      const hasApprovedEstimate = await ServiceEstimate.exists({
        jobCardId: jobCard._id,
        status: { $in: ['APPROVED', 'PARTIALLY_APPROVED'] }
      });

      const hasOwnerException = Boolean(
        jobCard.noEstimateException && jobCard.noEstimateException.isAuthorized === true
      );

      const hasAnyEstimate = await ServiceEstimate.exists({ jobCardId: jobCard._id });
      const isLegacyOwnerApprovedNote =
        !hasAnyEstimate &&
        req.user.role === 'OWNER' &&
        notes &&
        notes.toLowerCase().includes('customer approved estimate');

      if (!hasApprovedEstimate && !hasOwnerException && !isLegacyOwnerApprovedNote) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ESTIMATE_APPROVAL_REQUIRED',
            message:
              'Transition to IN_PROGRESS requires a customer-approved estimate or a documented OWNER-authorized no-estimate exception.'
          }
        });
      }
    }

    // Set lifecycle milestone timestamps
    if (newStatus === 'IN_PROGRESS' && !jobCard.startedAt) {
      jobCard.startedAt = new Date();
    }
    if (newStatus === 'COMPLETED' && !jobCard.completedAt) {
      jobCard.completedAt = new Date();
    }
    if (newStatus === 'DELIVERED' && !jobCard.deliveredAt) {
      jobCard.deliveredAt = new Date();
    }

    jobCard.status = newStatus;
    jobCard.statusTimeline.push({
      status: newStatus,
      changedBy: req.user._id,
      role: req.user.role,
      notes: notes ? String(notes).trim() : 'Workshop status update',
      timestamp: new Date()
    });

    jobCard.updatedBy = req.user._id;
    await jobCard.save();

    // If linked to an appointment and completed, keep appointment synchronized
    if (jobCard.appointmentId && newStatus === 'COMPLETED') {
      try {
        const linkedAppt = await Appointment.findById(jobCard.appointmentId);
        if (linkedAppt && linkedAppt.status === 'IN_PROGRESS') {
          linkedAppt.status = 'COMPLETED';
          linkedAppt.statusTimeline.push({
            status: 'COMPLETED',
            changedBy: req.user._id,
            role: req.user.role,
            reason: `Job Card ${jobCard.jobCardNumber} completed in workshop`,
            timestamp: new Date()
          });
          await linkedAppt.save();
        }
      } catch (apptErr) {
        console.warn('[JobCardStatus] Non-blocking appointment sync warning:', apptErr.message);
      }
    }

    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'JOB_CARD_STATUS_UPDATED',
      entityType: 'JobCard',
      entityId: jobCard._id,
      diff: {
        before: { status: previousStatus },
        after: { status: newStatus, notes: notes || null }
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'admin-api'
    });

    return res.status(200).json({
      success: true,
      message: `Job Card status updated from ${previousStatus} to ${newStatus}.`,
      data: jobCard
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// 6. GET JOB CARD BY APPOINTMENT ID (GET /appointments/:id/job-card)
// ==========================================
export async function getJobCardByAppointmentId(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid appointment ID format.' }
      });
    }

    const jobCard = await JobCard.findOne({ appointmentId: id })
      .populate('customerId')
      .populate('vehicleId')
      .populate('appointmentId')
      .populate('createdBy', 'fullName role email')
      .populate('updatedBy', 'fullName role email');

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        error: { code: 'JOB_CARD_NOT_FOUND', message: 'No Job Card found for this appointment.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: jobCard
    });
  } catch (err) {
    next(err);
  }
}
