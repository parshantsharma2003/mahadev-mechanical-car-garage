import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getAuthCookieOptions,
  getCsrfCookieOptions,
  signAuthToken,
  generateCsrfToken
} from '../utils/security.js';
import { createAuditRecord } from '../services/auditService.js';

/**
 * Handle Administrator Sign-In
 * POST /api/v1/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    // Check account active status
    if (!user.isActive) {
      // Record failed login due to deactivated account
      await createAuditRecord({
        actorId: user._id,
        actorRole: user.role,
        actorName: user.fullName,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user._id,
        diff: { reason: 'ACCOUNT_DEACTIVATED' },
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'unknown'
      }).catch((e) => console.error('[Audit Error]:', e.message));

      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'This account has been deactivated. Please contact the garage owner.'
        }
      });
    }

    // Verify password hash
    const isMatch = await user.comparePassword(password, user.passwordHash);

    if (!isMatch) {
      await createAuditRecord({
        actorId: user._id,
        actorRole: user.role,
        actorName: user.fullName,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user._id,
        diff: { reason: 'INVALID_PASSWORD' },
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'unknown'
      }).catch((e) => console.error('[Audit Error]:', e.message));

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    // Generate JWT and CSRF Token
    const token = signAuthToken({
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion
    });

    const csrfToken = generateCsrfToken();

    // Set HTTP-only Auth Cookie and Readable CSRF Cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Record login audit event
    await createAuditRecord({
      actorId: user._id,
      actorRole: user.role,
      actorName: user.fullName,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user._id,
      diff: { role: user.role },
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch((e) => console.error('[Audit Error]:', e.message));

    // Sanitized response (zero internal secrets or password hashes)
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          phone: user.phone || null,
          lastLoginAt: user.lastLoginAt
        },
        csrfToken
      }
    });
  } catch (err) {
    console.error('[Login Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during authentication.'
      }
    });
  }
}

/**
 * Handle Administrator Sign-Out
 * POST /api/v1/auth/logout
 */
export async function logout(req, res) {
  try {
    const user = req.user;

    if (user) {
      // Invalidate existing tokens server-side by incrementing tokenVersion
      await User.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } });

      await createAuditRecord({
        actorId: user._id,
        actorRole: user.role,
        actorName: user.fullName,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: user._id,
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'unknown'
      }).catch((e) => console.error('[Audit Error]:', e.message));
    }

    // Clear authentication & CSRF cookies
    res.clearCookie(AUTH_COOKIE_NAME, {
      ...getAuthCookieOptions(),
      maxAge: 0
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
      ...getCsrfCookieOptions(),
      maxAge: 0
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    console.error('[Logout Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred during sign out.'
      }
    });
  }
}

/**
 * Get Authenticated User Profile
 * GET /api/v1/auth/me
 */
export async function getMe(req, res) {
  const user = req.user;
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        lastLoginAt: user.lastLoginAt || null,
        createdAt: user.createdAt
      }
    }
  });
}

/**
 * Change Authenticated User Password
 * PUT /api/v1/auth/change-password
 */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both current password and new password are required.'
        }
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 8 characters long.'
        }
      });
    }

    // Fetch user with passwordHash
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    const isMatch = await user.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect.'
        }
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and increment tokenVersion (revokes all other active sessions)
    user.passwordHash = newHash;
    user.tokenVersion += 1;
    await user.save();

    // Issue fresh cookies for current session
    const token = signAuthToken({
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion
    });
    const csrfToken = generateCsrfToken();

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    // Audit log
    await createAuditRecord({
      actorId: user._id,
      actorRole: user.role,
      actorName: user.fullName,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch((e) => console.error('[Audit Error]:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      data: {
        csrfToken
      }
    });
  } catch (err) {
    console.error('[Change Password Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while updating your password.'
      }
    });
  }
}
