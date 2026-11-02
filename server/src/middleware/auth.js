import { User } from '../models/User.js';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../utils/security.js';

/**
 * Authentication middleware.
 * Verifies JWT from HTTP-only cookie, checks user account active status,
 * and confirms tokenVersion to enforce genuine session revocation.
 */
export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required. Please sign in.'
        }
      });
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        error: {
          code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          message: isExpired
            ? 'Your session has expired. Please sign in again.'
            : 'Invalid authentication token.'
        }
      });
    }

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Malformed token payload.'
        }
      });
    }

    // Fetch user and check active status
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account associated with this session no longer exists.'
        }
      });
    }

    // Active status validation on every authenticated request
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated. Please contact the garage owner.'
        }
      });
    }

    // TokenVersion validation for genuine session revocation
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_REVOKED',
          message: 'This session has been invalidated. Please sign in again.'
        }
      });
    }

    // Role consistency check: JWT role claim must match current database role
    if (user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ROLE_MISMATCH',
          message: 'User role has changed. Please sign in again.'
        }
      });
    }

    // Attach authenticated user to request (never exposes passwordHash)
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while verifying your session.'
      }
    });
  }
}

/**
 * Role-Based Access Control middleware.
 * Verifies that the authenticated user possesses one of the permitted roles.
 *
 * @param  {...('OWNER'|'SUPER_ADMIN')} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to perform this action.'
        }
      });
    }

    next();
  };
}

/**
 * Convenience middleware enforcing OWNER-only access.
 */
export const requireOwner = requireRole('OWNER');
