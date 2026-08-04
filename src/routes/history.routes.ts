import { Router } from 'express';
import { getHistory } from '../controllers/history.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const historyRouter = Router();

historyRouter.use(requireAuth);
historyRouter.get('/', getHistory);
