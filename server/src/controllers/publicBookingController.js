import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Service } from '../models/Service.js';
import { findOrCreateCustomer } from '../services/customerService.js';
import { resolveVehicle } from '../services/vehicleService.js';
import { isTransactionSupported } from '../config/db.js';
import {
  isValidUUIDv4,
  computePayloadFingerprint,
  findIdempotencyRecord,
  saveIdempotencyRecord,
  deleteIdempotencyRecord
} from '../utils/idempotency.js';

const VALID_TIME_SLOTS = [
  'Morning (09:00 AM - 12:00 PM)',
  'Afternoon (12:00 PM - 03:00 PM)',
  'Evening (03:00 PM - 07:00 PM)'
];

/**
 * Normalizes frontend time slot variations to schema enum
 */
function normalizeTimeSlot(slot) {
  if (!slot || typeof slot !== 'string') return null;
  const trimmed = slot.trim();
  if (VALID_TIME_SLOTS.includes(trimmed)) return trimmed;
  if (trimmed.includes('03:30 PM') || trimmed.includes('Afternoon')) {
    return 'Afternoon (12:00 PM - 03:00 PM)';
  }
  if (trimmed.includes('Morning')) {
    return 'Morning (09:00 AM - 12:00 PM)';
  }
  if (trimmed.includes('Evening')) {
    return 'Evening (03:00 PM - 07:00 PM)';
  }
  return null;
}

/**
 * Generates a unique booking reference e.g. MHG-2026-8492
 */
async function generateUniqueBookingReference(session = null) {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    const randomFour = Math.floor(1000 + Math.random() * 9000);
    const ref = `MHG-${year}-${randomFour}`;
    const query = Appointment.findOne({ bookingReference: ref });
    if (session) query.session(session);
    const exists = await query;
    if (!exists) return ref;
    attempts++;
  }
  return `MHG-${year}-${Date.now().toString().slice(-6)}`;
}

/**
 * POST /api/v1/public/appointments
 * Public customer appointment booking flow with idempotency, transactions, and deduplication
 */
export async function createPublicAppointment(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.header('Idempotency-Key');
    const endpoint = '/api/v1/public/appointments';

    // 1. Validate Idempotency Key
    if (!idempotencyKey || !isValidUUIDv4(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'A valid UUIDv4 Idempotency-Key header is required for appointment booking.'
        }
      });
    }

    const requestFingerprint = computePayloadFingerprint(req.body);

    // 2. Check for existing Idempotency Record
    const existingRecord = await findIdempotencyRecord(idempotencyKey, endpoint);
    if (existingRecord) {
      if (existingRecord.requestFingerprint === requestFingerprint) {
        // Idempotent retry: Replay cached response
        res.setHeader('X-Cache-Lookup', 'HIT');
        res.setHeader('Idempotent-Replay', 'true');
        return res.status(existingRecord.statusCode).json(existingRecord.responseBody);
      } else {
        // Key reused with different payload
        return res.status(409).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
            message: 'This Idempotency-Key was previously submitted with different request parameters.'
          }
        });
      }
    }

    // 3. Extract and validate input fields
    const {
      name,
      customerName,
      phone,
      mobileNumber,
      email,
      brand,
      model,
      registrationNumber,
      preferredDate,
      date,
      preferredTimeSlot,
      timeSlot,
      problemDescription,
      notes,
      serviceIds,
      serviceId,
      services: requestedServices,
      service: singleServiceTitle
    } = req.body;

    const rawName = (req.body.fullName || name || customerName || '').trim();
    const rawPhone = (phone || mobileNumber || '').trim();
    const rawBrand = (brand || '').trim();
    const rawModel = (model || '').trim();
    const rawDateStr = preferredDate || date;
    const rawSlotStr = preferredTimeSlot || timeSlot;

    // Name validation
    if (!rawName || rawName.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Customer name is required and must be at least 2 characters.'
        }
      });
    }

    // Phone presence validation (normalization will perform strict 10-digit Indian check)
    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mobile number is required.'
        }
      });
    }

    // Vehicle brand and model validation
    if (!rawBrand || !rawModel) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vehicle brand and model are both required.'
        }
      });
    }

    // Date validation
    if (!rawDateStr) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Preferred appointment date is required.'
        }
      });
    }

    const appointmentDate = new Date(rawDateStr);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: 'Preferred appointment date is not a valid date.'
        }
      });
    }

    // India (Asia/Kolkata) date checking
    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const rawMatch = String(rawDateStr).match(/^\d{4}-\d{2}-\d{2}/);
    const dateToCompare = rawMatch ? rawMatch[0] : appointmentDate.toISOString().split('T')[0];

    // Prevent past appointment dates
    if (dateToCompare < todayIST) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAST_DATE_NOT_ALLOWED',
          message: 'Appointment date cannot be in the past.'
        }
      });
    }

    // Prevent dates too far in advance (> 180 days)
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 180);
    const maxFutureDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(maxFutureDate);
    if (dateToCompare > maxFutureDateStr) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DATE_TOO_FAR_IN_FUTURE',
          message: 'Appointments can only be scheduled up to 180 days in advance.'
        }
      });
    }

    const targetDateMidnight = new Date(dateToCompare + 'T00:00:00.000Z');

    // Time slot validation
    const normalizedSlot = normalizeTimeSlot(rawSlotStr);
    if (!normalizedSlot) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIME_SLOT',
          message: `Please select a valid time slot: ${VALID_TIME_SLOTS.join(', ')}`
        }
      });
    }

    // 4. Resolve and Validate Selected Services
    const resolvedServices = [];

    // Case A: serviceIds passed as array of ObjectIds
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      for (const id of serviceIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_SERVICE_ID',
              message: `Invalid service ID format: ${id}`
            }
          });
        }
      }

      const activeServices = await Service.find({
        _id: { $in: serviceIds },
        isActive: true
      });

      if (activeServices.length !== serviceIds.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INACTIVE_OR_INVALID_SERVICE',
            message: 'One or more selected services are inactive or do not exist.'
          }
        });
      }

      activeServices.forEach((svc) => {
        resolvedServices.push({
          serviceId: svc._id,
          title: svc.title,
          priceDisplay: svc.priceDisplay
        });
      });
    }
    // Case B: Single serviceId passed
    else if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SERVICE_ID',
            message: 'Invalid service ID format.'
          }
        });
      }
      const svc = await Service.findOne({ _id: serviceId, isActive: true });
      if (!svc) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INACTIVE_OR_INVALID_SERVICE',
            message: 'The requested service is inactive or does not exist.'
          }
        });
      }
      resolvedServices.push({
        serviceId: svc._id,
        title: svc.title,
        priceDisplay: svc.priceDisplay
      });
    }
    // Case C: Array of service titles or objects passed
    else if (Array.isArray(requestedServices) && requestedServices.length > 0) {
      for (const item of requestedServices) {
        const title = typeof item === 'string' ? item : item?.title;
        if (!title) continue;

        const svc = await Service.findOne({
          title: new RegExp(`^${title.trim()}$`, 'i'),
          isActive: true
        });

        if (svc) {
          resolvedServices.push({
            serviceId: svc._id,
            title: svc.title,
            priceDisplay: svc.priceDisplay
          });
        } else if (title.toLowerCase().includes('custom') || title.toLowerCase().includes('inspection')) {
          resolvedServices.push({
            title: title.trim(),
            priceDisplay: 'Contact for Quote'
          });
        } else {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INACTIVE_OR_INVALID_SERVICE',
              message: `Service "${title}" is not an active workshop service.`
            }
          });
        }
      }
    }
    // Case D: Single service title string
    else if (singleServiceTitle) {
      const title = singleServiceTitle.trim();
      const svc = await Service.findOne({
        $or: [
          { title: new RegExp(`^${title}$`, 'i') },
          { slug: title.toLowerCase().replace(/\s+/g, '-') }
        ],
        isActive: true
      });

      if (svc) {
        resolvedServices.push({
          serviceId: svc._id,
          title: svc.title,
          priceDisplay: svc.priceDisplay
        });
      } else if (title.toLowerCase().includes('custom') || title.toLowerCase().includes('inspection')) {
        resolvedServices.push({
          title: title,
          priceDisplay: 'Contact for Quote'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INACTIVE_OR_INVALID_SERVICE',
            message: `Service "${title}" is not an active workshop service.`
          }
        });
      }
    }

    // Default fallback to first active core service if nothing provided
    if (resolvedServices.length === 0) {
      const defaultSvc = await Service.findOne({ isCoreService: true, isActive: true }).sort({ sortOrder: 1 });
      if (defaultSvc) {
        resolvedServices.push({
          serviceId: defaultSvc._id,
          title: defaultSvc.title,
          priceDisplay: defaultSvc.priceDisplay
        });
      } else {
        resolvedServices.push({
          title: 'General Car Service',
          priceDisplay: 'Contact for Quote'
        });
      }
    }

    const safeProblemDesc = (problemDescription || notes || '').trim().slice(0, 1000);

    // 5. Check if MongoDB deployment supports multi-document transactions (Atlas/Replica Set)
    const supportsTxn = await isTransactionSupported();

    // -----------------------------------------------------------------------------------
    // EXECUTION PATH A: MONGO DB ATLAS / REPLICA SET (MULTI-DOCUMENT ACID TRANSACTION)
    // -----------------------------------------------------------------------------------
    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        let responsePayload;

        await session.withTransaction(async () => {
          // A1. Customer Record Deduplication & Linking
          const customer = await findOrCreateCustomer(
            {
              fullName: rawName,
              mobileNumber: rawPhone,
              email: email || null,
              isBooking: true
            },
            { session }
          );

          // A2. Vehicle Resolution & Conflict Detection
          const { vehicle, conflict, conflictPlate, displayPlate } = await resolveVehicle(
            {
              customerId: customer._id,
              brand: rawBrand,
              model: rawModel,
              registrationNumber: registrationNumber || null
            },
            { session }
          );

          // A3. Generate Unique Booking Reference
          const bookingReference = await generateUniqueBookingReference(session);

          // A4. Build and Save Appointment
          const adminNotes = conflict
            ? `[FLAGGED REGISTRATION CONFLICT]: Plate "${conflictPlate}" is currently registered to another customer in the system. Verify ownership with customer before updating vehicle records.`
            : '';

          const appointment = new Appointment({
            bookingReference,
            idempotencyKey: idempotencyKey.trim(),
            requestFingerprint,
            customerId: customer._id,
            vehicleId: vehicle ? vehicle._id : null,
            customerSnapshot: {
              fullName: customer.fullName,
              mobileNumber: customer.mobileNumber
            },
            vehicleSnapshot: {
              brand: rawBrand,
              model: rawModel,
              registrationNumber: displayPlate || ''
            },
            services: resolvedServices,
            preferredDate: targetDateMidnight,
            preferredTimeSlot: normalizedSlot,
            problemDescription: safeProblemDesc,
            status: 'PENDING',
            statusTimeline: [
              {
                status: 'PENDING',
                role: 'CUSTOMER',
                reason: 'Online booking request submitted via website',
                timestamp: new Date()
              }
            ],
            source: 'WEBSITE_ONLINE',
            registrationConflict: Boolean(conflict),
            adminNotes
          });

          await appointment.save({ session });

          // A5. Safe Response Payload
          responsePayload = {
            success: true,
            message: 'Appointment booking request received successfully. Our service manager will confirm your slot.',
            data: {
              bookingReference,
              status: 'PENDING',
              preferredDate: targetDateMidnight.toISOString().split('T')[0],
              preferredTimeSlot: normalizedSlot,
              customer: {
                fullName: customer.fullName,
                mobileNumber: customer.mobileNumber
              },
              vehicle: {
                brand: rawBrand,
                model: rawModel,
                registrationNumber: displayPlate || ''
              },
              services: resolvedServices.map((s) => ({
                title: s.title,
                priceDisplay: s.priceDisplay
              })),
              registrationConflict: Boolean(conflict),
              createdAt: appointment.createdAt
            }
          };

          // A6. Store Idempotency Record within the transaction
          await saveIdempotencyRecord(
            {
              key: idempotencyKey,
              endpoint,
              statusCode: 201,
              responseBody: responsePayload,
              requestFingerprint,
              status: 'COMPLETED'
            },
            { session }
          );
        });

        return res.status(201).json(responsePayload);
      } catch (txnErr) {
        // Handle concurrent race condition on idempotency key
        if (
          txnErr.code === 11000 &&
          (txnErr.keyPattern?.idempotencyKey || String(txnErr.message).includes('idempotencyKey'))
        ) {
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            const rec = await findIdempotencyRecord(idempotencyKey, endpoint);
            if (rec) {
              if (rec.requestFingerprint && rec.requestFingerprint !== requestFingerprint) {
                return res.status(409).json({
                  success: false,
                  error: {
                    code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
                    message: 'This Idempotency-Key was previously submitted with different request parameters.'
                  }
                });
              }
              res.setHeader('X-Cache-Lookup', 'HIT');
              res.setHeader('Idempotent-Replay', 'true');
              return res.status(rec.statusCode).json(rec.responseBody);
            }
          }

          const racedAppt = await Appointment.findOne({ idempotencyKey: idempotencyKey.trim() });
          if (racedAppt) {
            if (racedAppt.requestFingerprint && racedAppt.requestFingerprint !== requestFingerprint) {
              return res.status(409).json({
                success: false,
                error: {
                  code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
                  message: 'This Idempotency-Key was previously submitted with different request parameters.'
                }
              });
            }
            return res.status(201).json({
              success: true,
              message: 'Appointment booking request received successfully. Our service manager will confirm your slot.',
              data: {
                bookingReference: racedAppt.bookingReference,
                status: racedAppt.status,
                preferredDate: racedAppt.preferredDate.toISOString().split('T')[0],
                preferredTimeSlot: racedAppt.preferredTimeSlot,
                customer: racedAppt.customerSnapshot,
                vehicle: racedAppt.vehicleSnapshot,
                services: racedAppt.services.map((s) => ({ title: s.title, priceDisplay: s.priceDisplay })),
                registrationConflict: Boolean(racedAppt.registrationConflict),
                createdAt: racedAppt.createdAt
              }
            });
          }
        }

        if (txnErr.message?.includes('valid 10-digit')) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PHONE_NUMBER',
              message: txnErr.message
            }
          });
        }

        throw txnErr;
      } finally {
        await session.endSession();
      }
    }

    // -----------------------------------------------------------------------------------
    // EXECUTION PATH B: LOCAL STANDALONE MONGO DB (COMPENSATION ROLLBACK INTEGRITY)
    // -----------------------------------------------------------------------------------
    let customer = null;
    let vehicle = null;
    let conflict = false;
    let conflictPlate = '';
    let displayPlate = '';
    let isNewProvisional = false;

    try {
      customer = await findOrCreateCustomer({
        fullName: rawName,
        mobileNumber: rawPhone,
        email: email || null,
        isBooking: true
      });
    } catch (normErr) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE_NUMBER',
          message: normErr.message || 'Must be a valid 10-digit Indian mobile number.'
        }
      });
    }

    try {
      const vehicleResult = await resolveVehicle({
        customerId: customer._id,
        brand: rawBrand,
        model: rawModel,
        registrationNumber: registrationNumber || null
      });

      vehicle = vehicleResult.vehicle;
      conflict = vehicleResult.conflict;
      conflictPlate = vehicleResult.conflictPlate;
      displayPlate = vehicleResult.displayPlate;
      isNewProvisional = Boolean(vehicleResult.isNewProvisional);

      const bookingReference = await generateUniqueBookingReference();
      const adminNotes = conflict
        ? `[FLAGGED REGISTRATION CONFLICT]: Plate "${conflictPlate}" is currently registered to another customer in the system. Verify ownership with customer before updating vehicle records.`
        : '';

      const appointment = new Appointment({
        bookingReference,
        idempotencyKey: idempotencyKey.trim(),
        requestFingerprint,
        customerId: customer._id,
        vehicleId: vehicle ? vehicle._id : null,
        customerSnapshot: {
          fullName: customer.fullName,
          mobileNumber: customer.mobileNumber
        },
        vehicleSnapshot: {
          brand: rawBrand,
          model: rawModel,
          registrationNumber: displayPlate || ''
        },
        services: resolvedServices,
        preferredDate: targetDateMidnight,
        preferredTimeSlot: normalizedSlot,
        problemDescription: safeProblemDesc,
        status: 'PENDING',
        statusTimeline: [
          {
            status: 'PENDING',
            role: 'CUSTOMER',
            reason: 'Online booking request submitted via website',
            timestamp: new Date()
          }
        ],
        source: 'WEBSITE_ONLINE',
        registrationConflict: Boolean(conflict),
        adminNotes
      });

      try {
        await appointment.save();
      } catch (saveErr) {
        if (
          saveErr.code === 11000 &&
          (saveErr.keyPattern?.idempotencyKey || String(saveErr.message).includes('idempotencyKey'))
        ) {
          // If a newly created provisional vehicle was created for this raced request, clean it up
          if (isNewProvisional && vehicle?._id) {
            await Vehicle.deleteOne({ _id: vehicle._id }).catch(() => {});
          }

          // A concurrent request with the same idempotency key won the race.
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            const rec = await findIdempotencyRecord(idempotencyKey, endpoint);
            if (rec) {
              if (rec.requestFingerprint && rec.requestFingerprint !== requestFingerprint) {
                return res.status(409).json({
                  success: false,
                  error: {
                    code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
                    message: 'This Idempotency-Key was previously submitted with different request parameters.'
                  }
                });
              }
              res.setHeader('X-Cache-Lookup', 'HIT');
              res.setHeader('Idempotent-Replay', 'true');
              return res.status(rec.statusCode).json(rec.responseBody);
            }
          }

          const racedAppt = await Appointment.findOne({ idempotencyKey: idempotencyKey.trim() });
          if (racedAppt) {
            if (racedAppt.requestFingerprint && racedAppt.requestFingerprint !== requestFingerprint) {
              return res.status(409).json({
                success: false,
                error: {
                  code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
                  message: 'This Idempotency-Key was previously submitted with different request parameters.'
                }
              });
            }
            return res.status(201).json({
              success: true,
              message: 'Appointment booking request received successfully. Our service manager will confirm your slot.',
              data: {
                bookingReference: racedAppt.bookingReference,
                status: racedAppt.status,
                preferredDate: racedAppt.preferredDate.toISOString().split('T')[0],
                preferredTimeSlot: racedAppt.preferredTimeSlot,
                customer: racedAppt.customerSnapshot,
                vehicle: racedAppt.vehicleSnapshot,
                services: racedAppt.services.map((s) => ({ title: s.title, priceDisplay: s.priceDisplay })),
                registrationConflict: Boolean(racedAppt.registrationConflict),
                createdAt: racedAppt.createdAt
              }
            });
          }
        }
        throw saveErr;
      }

      const confirmationData = {
        bookingReference,
        status: 'PENDING',
        preferredDate: targetDateMidnight.toISOString().split('T')[0],
        preferredTimeSlot: normalizedSlot,
        customer: {
          fullName: customer.fullName,
          mobileNumber: customer.mobileNumber
        },
        vehicle: {
          brand: rawBrand,
          model: rawModel,
          registrationNumber: displayPlate || ''
        },
        services: resolvedServices.map((s) => ({
          title: s.title,
          priceDisplay: s.priceDisplay
        })),
        registrationConflict: Boolean(conflict),
        createdAt: appointment.createdAt
      };

      const responsePayload = {
        success: true,
        message: 'Appointment booking request received successfully. Our service manager will confirm your slot.',
        data: confirmationData
      };

      await saveIdempotencyRecord({
        key: idempotencyKey,
        endpoint,
        statusCode: 201,
        responseBody: responsePayload,
        requestFingerprint,
        status: 'COMPLETED'
      });

      return res.status(201).json(responsePayload);
    } catch (opErr) {
      // Standalone compensation cleanup: revert partial mutations so incomplete state is never left behind
      if (isNewProvisional && vehicle?._id) {
        await Vehicle.deleteOne({ _id: vehicle._id }).catch(() => {});
      }
      if (customer?._id) {
        await Customer.updateOne({ _id: customer._id }, { $inc: { totalBookingsCount: -1 } }).catch(() => {});
      }
      await deleteIdempotencyRecord(idempotencyKey, endpoint).catch(() => {});
      throw opErr;
    }
  } catch (err) {
    next(err);
  }
}

