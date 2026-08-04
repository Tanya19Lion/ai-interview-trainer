import { Router } from 'express';
import { startSession, submitAnswer } from '../controllers/interview.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const interviewRouter = Router();

interviewRouter.use(requireAuth);
interviewRouter.post('/start', startSession);
interviewRouter.post('/:sessionId/answer', submitAnswer);
