import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  changePassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

// Public Authentication Route (Protected with Rate Limiting)
authRouter.post('/login', loginRateLimiter, login);

// Authenticated Routes
authRouter.get('/me', authenticate, getMe);
authRouter.post('/logout', authenticate, verifyCsrf, logout);
authRouter.put('/change-password', authenticate, verifyCsrf, changePassword);

export default authRouter;
