import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './routes/authRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { operationalRouter } from './routes/operationalRoutes.js';
import { jobCardRouter } from './routes/jobCardRoutes.js';
import { estimateRouter } from './routes/estimateRoutes.js';
import { billingRouter } from './routes/billingRoutes.js';
import { expenseRouter } from './routes/expenseRoutes.js';
import { supplierRouter } from './routes/supplierRoutes.js';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { publicRouter } from './routes/publicRoutes.js';
import { getJobCardByAppointmentId } from './controllers/jobCardController.js';
import { authenticate, requireRole } from './middleware/auth.js';
import { logger } from './utils/logger.js';

dotenv.config();

export const app = express();

// Trust reverse proxy (Render edge load balancer sets X-Forwarded-For)
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Explicitly allowed frontend origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174'
].filter(Boolean);

// CORS configuration for Vercel <-> Render cross-domain architecture
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const corsErr = new Error(`CORS blocked for origin: ${origin}`);
      corsErr.statusCode = 403;
      corsErr.code = 'CORS_ORIGIN_BLOCKED';
      return callback(corsErr);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key']
  })
);

// Body Parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Rate Limiting Protection (Disabled in test runs)
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again after 15 minutes.'
    }
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please wait 15 minutes before trying again.'
    }
  }
});

// ----------------------------------------------------
// Health Check & Readiness Endpoints (Root & /api/v1)
// ----------------------------------------------------

// Liveness Probe (/health & /api/v1/health): verifies application process is running
const handleLiveness = (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'mahadev-garage-backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};

app.get('/health', handleLiveness);
app.get('/api/v1/health', handleLiveness);

// Readiness Probe (/ready & /api/v1/ready): verifies MongoDB connection readiness
const handleReadiness = (req, res) => {
  const readyState = mongoose.connection.readyState;
  const isDbConnected = readyState === 1;

  if (!isDbConnected) {
    logger.warn('READINESS_CHECK_DEGRADED', `Database connectivity degraded. readyState: ${readyState}`);
  }

  const responsePayload = {
    success: isDbConnected,
    status: isDbConnected ? 'ready' : 'not_ready',
    service: 'mahadev-garage-backend',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };

  const statusCode = isDbConnected ? 200 : 503;
  return res.status(statusCode).json(responsePayload);
};

app.get('/ready', handleReadiness);
app.get('/api/v1/ready', handleReadiness);

// ----------------------------------------------------
// API Routes with Rate Limiting
// ----------------------------------------------------
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin/users', userRouter);
app.use('/api/v1/users', userRouter); // Alias supporting both Phase 2 and Phase 4 spec
app.use('/api/v1/admin', operationalRouter);
app.use('/api/v1/job-cards', jobCardRouter);
app.use('/api/v1/estimates', estimateRouter);
app.use('/api/v1', billingRouter);
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/admin/expenses', expenseRouter);
app.use('/api/v1', supplierRouter);
app.use('/api/v1/admin', supplierRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/admin/analytics', analyticsRouter);
app.get('/api/v1/appointments/:id/job-card', authenticate, requireRole('OWNER', 'SUPER_ADMIN'), getJobCardByAppointmentId);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1', publicRouter); // Direct public access for /services, /appointments, /enquiries

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized Error Handler
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error('APP_REQUEST_ERROR', err.message, {
    statusCode,
    code: err.code,
    path: req.originalUrl,
    method: req.method,
    stack: isProd ? undefined : err.stack
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isProd && statusCode === 500 ? 'An unexpected server error occurred.' : err.message
    }
  });
});

export default app;
