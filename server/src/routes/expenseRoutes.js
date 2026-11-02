import { Router } from 'express';
import {
  listExpenses,
  createExpense,
  getExpenseById,
  reverseExpense,
  getExpenseStats
} from '../controllers/expenseController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { verifyCsrf } from '../middleware/csrf.js';

export const expenseRouter = Router();

// Staff authentication for all expense endpoints
const staffAuth = [authenticate, requireRole('OWNER', 'SUPER_ADMIN')];

expenseRouter.use(staffAuth);

expenseRouter.get('/stats', getExpenseStats);
expenseRouter.get('/', listExpenses);
expenseRouter.post('/', verifyCsrf, createExpense);
expenseRouter.get('/:id', getExpenseById);
expenseRouter.post('/:id/reverse', requireRole('OWNER'), verifyCsrf, reverseExpense);

export default expenseRouter;
