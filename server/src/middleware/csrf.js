import { CSRF_COOKIE_NAME, validateCsrfToken } from '../utils/security.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Double-submit CSRF and Origin verification middleware.
 *
 * Requirements enforced:
 * 1. Safe methods (GET, HEAD, OPTIONS) bypass CSRF.
 * 2. Origin Verification: If browser provides an Origin header on state-changing requests,
 *    it must match the explicitly permitted frontend origins.
 * 3. Double-Submit Verification: X-CSRF-Token header must match mahadev_csrf_token cookie
 *    using timing-safe comparison.
 */
export function verifyCsrf(req, res, next) {
  // Safe methods do not require CSRF token
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // 1. Origin Header Verification (when present in browser requests)
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174'
    ].filter(Boolean);

    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNTRUSTED_ORIGIN',
          message: `Request blocked: Untrusted origin '${origin}'.`
        }
      });
    }
  }

  // 2. Double-Submit Cookie & Header Verification
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken =
    req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'] || req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_MISSING',
        message: 'Security token missing. CSRF protection requires both cookie and X-CSRF-Token header.'
      }
    });
  }

  if (!validateCsrfToken(headerToken, cookieToken)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_INVALID',
        message: 'Invalid CSRF token.'
      }
    });
  }

  next();
}
