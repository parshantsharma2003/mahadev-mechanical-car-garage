import mongoose from 'mongoose';
import { Enquiry } from '../models/Enquiry.js';
import { findOrCreateCustomer } from '../services/customerService.js';
import { isTransactionSupported } from '../config/db.js';
import {
  isValidUUIDv4,
  computePayloadFingerprint,
  findIdempotencyRecord,
  saveIdempotencyRecord,
  deleteIdempotencyRecord
} from '../utils/idempotency.js';

/**
 * Generates a unique enquiry ticket reference e.g. ENQ-2026-4821
 */
async function generateUniqueTicketNumber(session = null) {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    const randomFour = Math.floor(1000 + Math.random() * 9000);
    const ticket = `ENQ-${year}-${randomFour}`;
    const query = Enquiry.findOne({ ticketNumber: ticket });
    if (session) query.session(session);
    const exists = await query;
    if (!exists) return ticket;
    attempts++;
  }
  return `ENQ-${year}-${Date.now().toString().slice(-6)}`;
}

/**
 * POST /api/v1/public/enquiries
 * Public customer enquiry submission endpoint with customer linking and rate limiting
 */
export async function createPublicEnquiry(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.header('Idempotency-Key');
    const endpoint = '/api/v1/public/enquiries';

    // Optional Idempotency handling
    let requestFingerprint = null;
    if (idempotencyKey) {
      if (!isValidUUIDv4(idempotencyKey)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IDEMPOTENCY_KEY',
            message: 'Provided Idempotency-Key must be a valid UUIDv4.'
          }
        });
      }

      requestFingerprint = computePayloadFingerprint(req.body);
      const existingRecord = await findIdempotencyRecord(idempotencyKey, endpoint);
      if (existingRecord) {
        if (existingRecord.requestFingerprint === requestFingerprint) {
          res.setHeader('X-Cache-Lookup', 'HIT');
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(existingRecord.statusCode).json(existingRecord.responseBody);
        } else {
          return res.status(409).json({
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH',
              message: 'This Idempotency-Key was previously submitted with different request parameters.'
            }
          });
        }
      }
    }

    const {
      name,
      customerName,
      phone,
      mobileNumber,
      email,
      subject,
      message,
      preferredContactMethod,
      serviceContext,
      vehicleContext
    } = req.body;

    const rawName = (name || customerName || '').trim();
    const rawPhone = (phone || mobileNumber || '').trim();
    const rawMessage = (message || '').trim();
    const rawSubject = (subject || 'Website Service Enquiry').trim();
    const rawContactMethod = (preferredContactMethod || 'PHONE').toUpperCase();

    // 1. Validation
    if (!rawName || rawName.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Customer name is required and must be at least 2 characters.'
        }
      });
    }

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mobile number is required.'
        }
      });
    }

    if (!rawMessage || rawMessage.length < 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Enquiry message must be at least 5 characters long.'
        }
      });
    }

    if (rawMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Enquiry message cannot exceed 2000 characters.'
        }
      });
    }

    const validContactMethods = ['PHONE', 'WHATSAPP', 'ANY'];
    const contactMethod = validContactMethods.includes(rawContactMethod) ? rawContactMethod : 'PHONE';

    // Compile context into message/subject if provided
    const fullSubject = rawSubject.slice(0, 150);
    let contextualMessage = rawMessage;
    if (serviceContext || vehicleContext) {
      const extraContext = [];
      if (serviceContext) extraContext.push(`Service: ${serviceContext}`);
      if (vehicleContext) extraContext.push(`Vehicle: ${vehicleContext}`);
      contextualMessage = `${rawMessage}\n\n[Context]: ${extraContext.join(' | ')}`;
    }

    const supportsTxn = await isTransactionSupported();

    // -----------------------------------------------------------------------------------
    // EXECUTION PATH A: MONGO DB ATLAS / REPLICA SET (TRANSACTIONAL)
    // -----------------------------------------------------------------------------------
    if (supportsTxn) {
      const session = await mongoose.startSession();
      try {
        let responsePayload;

        await session.withTransaction(async () => {
          const customer = await findOrCreateCustomer(
            {
              fullName: rawName,
              mobileNumber: rawPhone,
              email: email || null,
              isBooking: false
            },
            { session }
          );

          const ticketNumber = await generateUniqueTicketNumber(session);

          const enquiry = new Enquiry({
            ticketNumber,
            customerName: customer.fullName,
            mobileNumber: customer.mobileNumber,
            customerId: customer._id,
            subject: fullSubject,
            message: contextualMessage,
            preferredContactMethod: contactMethod,
            status: 'PENDING'
          });

          await enquiry.save({ session });

          responsePayload = {
            success: true,
            message: 'Your enquiry has been received. Our team will contact you shortly.',
            data: {
              ticketNumber,
              status: 'PENDING',
              customerName: customer.fullName,
              subject: fullSubject,
              preferredContactMethod: contactMethod,
              createdAt: enquiry.createdAt
            }
          };

          if (idempotencyKey && requestFingerprint) {
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
          }
        });

        return res.status(201).json(responsePayload);
      } catch (txnErr) {
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
    // EXECUTION PATH B: LOCAL STANDALONE MONGO DB (COMPENSATION INTEGRITY)
    // -----------------------------------------------------------------------------------
    let customer;
    try {
      customer = await findOrCreateCustomer({
        fullName: rawName,
        mobileNumber: rawPhone,
        email: email || null,
        isBooking: false
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
      const ticketNumber = await generateUniqueTicketNumber();

      const enquiry = new Enquiry({
        ticketNumber,
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        customerId: customer._id,
        subject: fullSubject,
        message: contextualMessage,
        preferredContactMethod: contactMethod,
        status: 'PENDING'
      });

      await enquiry.save();

      const responsePayload = {
        success: true,
        message: 'Your enquiry has been received. Our team will contact you shortly.',
        data: {
          ticketNumber,
          status: 'PENDING',
          customerName: customer.fullName,
          subject: fullSubject,
          preferredContactMethod: contactMethod,
          createdAt: enquiry.createdAt
        }
      };

      if (idempotencyKey && requestFingerprint) {
        await saveIdempotencyRecord({
          key: idempotencyKey,
          endpoint,
          statusCode: 201,
          responseBody: responsePayload,
          requestFingerprint,
          status: 'COMPLETED'
        });
      }

      return res.status(201).json(responsePayload);
    } catch (opErr) {
      if (idempotencyKey) {
        await deleteIdempotencyRecord(idempotencyKey, endpoint).catch(() => {});
      }
      throw opErr;
    }
  } catch (err) {
    next(err);
  }
}

