import { Router } from 'express';
import {
  getEstimateById,
  sendEstimate,
  reviseEstimate,
  recordEstimateDecision,
  recordNoEstimateException
} from '../controllers/estimateController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';

export const estimateRouter = Router();

// Protect ALL estimate operations with OWNER and SUPER_ADMIN authentication
estimateRouter.use(authenticate, requireRole('OWNER', 'SUPER_ADMIN'));

estimateRouter.get('/:id', getEstimateById);
estimateRouter.post('/:id/send', verifyCsrf, sendEstimate);
estimateRouter.post('/:id/revise', verifyCsrf, reviseEstimate);
estimateRouter.post('/:id/decision', verifyCsrf, recordEstimateDecision);
estimateRouter.post('/:id/record-exception', verifyCsrf, recordNoEstimateException);

export default estimateRouter;
