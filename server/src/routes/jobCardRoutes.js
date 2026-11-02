import { Router } from 'express';
import {
  listJobCards,
  createJobCard,
  getJobCardById,
  updateJobCard,
  updateJobCardStatus
} from '../controllers/jobCardController.js';
import {
  getEstimatesForJobCard,
  createEstimateForJobCard,
  recordNoEstimateException
} from '../controllers/estimateController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';

export const jobCardRouter = Router();

jobCardRouter.use(authenticate, requireRole('OWNER', 'SUPER_ADMIN'));

jobCardRouter.get('/', listJobCards);
jobCardRouter.post('/', verifyCsrf, createJobCard);
jobCardRouter.get('/:id', getJobCardById);
jobCardRouter.patch('/:id', verifyCsrf, updateJobCard);
jobCardRouter.patch('/:id/status', verifyCsrf, updateJobCardStatus);

// Estimates on Job Card (Phase 6)
jobCardRouter.get('/:id/estimates', getEstimatesForJobCard);
jobCardRouter.post('/:id/estimates', verifyCsrf, createEstimateForJobCard);
jobCardRouter.post('/:id/record-exception', verifyCsrf, recordNoEstimateException);

export default jobCardRouter;

