import { Router } from 'express';
import {
  createSuperAdmin,
  listSuperAdmins,
  getSuperAdminById,
  updateSuperAdmin,
  toggleSuperAdminStatus,
  resetSuperAdminPassword
} from '../controllers/userController.js';
import { authenticate, requireOwner } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';

export const userRouter = Router();

// Protect ALL user management routes with Authentication and OWNER-only authorization
userRouter.use(authenticate, requireOwner);

// Query routes
userRouter.get('/', listSuperAdmins);
userRouter.get('/:id', getSuperAdminById);

// State-changing routes (require CSRF verification)
userRouter.post('/', verifyCsrf, createSuperAdmin);
userRouter.put('/:id', verifyCsrf, updateSuperAdmin);
userRouter.patch('/:id/status', verifyCsrf, toggleSuperAdminStatus);
userRouter.put('/:id/reset-password', verifyCsrf, resetSuperAdminPassword);

export default userRouter;
