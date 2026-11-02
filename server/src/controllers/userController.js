import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { createAuditRecord } from '../services/auditService.js';
import { normalizeIndianPhone } from '../utils/normalizers.js';

/**
 * Create a new SUPER_ADMIN account (OWNER only)
 * POST /api/v1/admin/users
 */
export async function createSuperAdmin(req, res) {
  try {
    const { fullName, email, password, phone } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Full name, email, and password are required.'
        }
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long.'
        }
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An administrator account with this email address already exists.'
        }
      });
    }

    // Normalize phone if provided
    let cleanPhone = null;
    if (phone) {
      try {
        cleanPhone = normalizeIndianPhone(phone);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE',
            message: err.message
          }
        });
      }
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Strictly enforce role as SUPER_ADMIN
    const newAdmin = await User.create({
      fullName: fullName.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'SUPER_ADMIN', // Strictly SUPER_ADMIN only
      phone: cleanPhone,
      isActive: true,
      tokenVersion: 0,
      createdBy: req.user._id
    });

    // Record audit event
    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newAdmin._id,
      diff: {
        createdRole: 'SUPER_ADMIN',
        fullName: newAdmin.fullName,
        email: newAdmin.email
      },
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch((e) => console.error('[Audit Error]:', e.message));

    return res.status(201).json({
      success: true,
      message: 'Super Admin account created successfully.',
      data: {
        user: {
          id: newAdmin._id,
          fullName: newAdmin.fullName,
          email: newAdmin.email,
          role: newAdmin.role,
          phone: newAdmin.phone,
          isActive: newAdmin.isActive,
          createdAt: newAdmin.createdAt
        }
      }
    });
  } catch (err) {
    console.error('[Create SuperAdmin Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while creating the Super Admin account.'
      }
    });
  }
}

/**
 * List SUPER_ADMIN accounts (OWNER only)
 * GET /api/v1/admin/users
 */
export async function listSuperAdmins(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { role: 'SUPER_ADMIN' };

    // Filter by status if provided
    if (req.query.status === 'active') {
      query.isActive = true;
    } else if (req.query.status === 'inactive') {
      query.isActive = false;
    }

    // Search by name or email
    if (req.query.search && typeof req.query.search === 'string') {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ fullName: searchRegex }, { email: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u._id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          phone: u.phone,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    console.error('[List SuperAdmins Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while listing Super Admin accounts.'
      }
    });
  }
}

/**
 * Get single SUPER_ADMIN by ID (OWNER only)
 * GET /api/v1/admin/users/:id
 */
export async function getSuperAdminById(req, res) {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    // Restrict this management endpoint strictly to SUPER_ADMIN records
    if (targetUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'This module is restricted to managing Super Admin accounts.'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: targetUser._id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          role: targetUser.role,
          phone: targetUser.phone,
          isActive: targetUser.isActive,
          lastLoginAt: targetUser.lastLoginAt,
          createdAt: targetUser.createdAt
        }
      }
    });
  } catch (err) {
    console.error('[Get SuperAdmin By ID Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while retrieving the user.'
      }
    });
  }
}

/**
 * Update SUPER_ADMIN details (OWNER only)
 * PUT /api/v1/admin/users/:id
 * Mass assignment protected: permits updating ONLY fullName and phone.
 */
export async function updateSuperAdmin(req, res) {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    // Cannot target OWNER accounts
    if (targetUser.role === 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_TARGET',
          message: 'Owner accounts cannot be modified through this endpoint.'
        }
      });
    }

    const { fullName, phone } = req.body || {};
    const beforeSnapshot = {
      fullName: targetUser.fullName,
      phone: targetUser.phone
    };

    if (fullName && typeof fullName === 'string') {
      targetUser.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (phone === null || phone === '') {
        targetUser.phone = null;
      } else {
        try {
          targetUser.phone = normalizeIndianPhone(phone);
        } catch (err) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PHONE',
              message: err.message
            }
          });
        }
      }
    }

    await targetUser.save();

    // Audit log
    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: targetUser._id,
      diff: {
        before: beforeSnapshot,
        after: {
          fullName: targetUser.fullName,
          phone: targetUser.phone
        }
      },
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch((e) => console.error('[Audit Error]:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Super Admin details updated successfully.',
      data: {
        user: {
          id: targetUser._id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          role: targetUser.role,
          phone: targetUser.phone,
          isActive: targetUser.isActive
        }
      }
    });
  } catch (err) {
    console.error('[Update SuperAdmin Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while updating the Super Admin.'
      }
    });
  }
}

/**
 * Deactivate or Reactivate SUPER_ADMIN (OWNER only)
 * PATCH /api/v1/admin/users/:id/status
 */
export async function toggleSuperAdminStatus(req, res) {
  try {
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'isActive boolean field is required.'
        }
      });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    // Safety check: Never deactivate an OWNER account or the last active OWNER
    if (targetUser.role === 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_OPERATION',
          message: 'Owner accounts cannot be deactivated.'
        }
      });
    }

    targetUser.isActive = isActive;

    // If deactivating, increment tokenVersion so active tokens become immediately invalid
    if (!isActive) {
      targetUser.tokenVersion += 1;
    }

    await targetUser.save();

    // Audit log
    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'USER_STATUS_TOGGLED',
      entityType: 'User',
      entityId: targetUser._id,
      diff: { isActive },
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch((e) => console.error('[Audit Error]:', e.message));

    return res.status(200).json({
      success: true,
      message: `Super Admin account has been ${isActive ? 'reactivated' : 'deactivated'} successfully.`,
      data: {
        user: {
          id: targetUser._id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          role: targetUser.role,
          isActive: targetUser.isActive
        }
      }
    });
  } catch (err) {
    console.error('[Toggle Status Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while updating account status.'
      }
    });
  }
}

/**
 * Reset password for a SUPER_ADMIN (OWNER only)
 * PUT /api/v1/admin/users/:id/reset-password
 */
export async function resetSuperAdminPassword(req, res) {
  try {
    const { newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 8 characters long.'
        }
      });
    }

    const targetUser = await User.findById(req.params.id).select('+passwordHash');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.'
        }
      });
    }

    // Safety check: Cannot reset OWNER password through this administrative endpoint
    if (targetUser.role === 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_TARGET',
          message: 'Owner password must be changed through the self-service change-password endpoint.'
        }
      });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    targetUser.passwordHash = passwordHash;
    // Invalidate existing sessions for this user
    targetUser.tokenVersion += 1;
    await targetUser.save();

    // Audit log
    await createAuditRecord({
      actorId: req.user._id,
      actorRole: req.user.role,
      actorName: req.user.fullName,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: targetUser._id,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    }).catch((e) => console.error('[Audit Error]:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Super Admin password has been reset successfully.'
    });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while resetting password.'
      }
    });
  }
}
