import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for administrative login endpoint.
 * Limits repeated authentication attempts to protect against brute-force attacks.
 * Standard: 5 attempts per 15 minutes per IP address.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // In test environment, if test explicitly requests bypass, allow higher limit
    if (req.headers['x-test-bypass-rate-limit'] === 'true') {
      return 1000;
    }
    return 5;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
      }
    });
  }
});

/**
 * Rate limiter for public appointment bookings.
 * 15 bookings per 15 minutes per IP address.
 */
export const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.headers['x-test-bypass-rate-limit'] === 'true') {
      return 1000;
    }
    return 15;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many appointment booking requests from this IP. Please try again later or call our helpline directly.'
      }
    });
  }
});

/**
 * Rate limiter for public customer enquiries.
 * 20 enquiries per 15 minutes per IP address.
 */
export const publicEnquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.headers['x-test-bypass-rate-limit'] === 'true') {
      return 1000;
    }
    return 20;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many enquiry submissions from this IP. Please wait before submitting another enquiry.'
      }
    });
  }
});

/**
 * Rate limiter for public services catalog.
 * 120 requests per 15 minutes per IP address.
 */
export const publicServiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.headers['x-test-bypass-rate-limit'] === 'true') {
      return 10000;
    }
    return 120;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many catalog requests. Please wait a moment.'
      }
    });
  }
});
