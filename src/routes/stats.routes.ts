import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();

statsRouter.use(requireAuth);
statsRouter.get('/', getStats);
