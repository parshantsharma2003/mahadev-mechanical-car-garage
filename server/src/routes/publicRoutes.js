import { Router } from 'express';
import { createPublicAppointment } from '../controllers/publicBookingController.js';
import { createPublicEnquiry } from '../controllers/publicEnquiryController.js';
import { getPublicServices } from '../controllers/publicServiceController.js';
import {
  publicBookingLimiter,
  publicEnquiryLimiter,
  publicServiceLimiter
} from '../middleware/rateLimiter.js';

export const publicRouter = Router();

// Public Appointment Booking
publicRouter.post('/appointments', publicBookingLimiter, createPublicAppointment);

// Public Customer Enquiry
publicRouter.post('/enquiries', publicEnquiryLimiter, createPublicEnquiry);

// Public Services Catalog (Active Services Only)
publicRouter.get('/services', publicServiceLimiter, getPublicServices);

export default publicRouter;
