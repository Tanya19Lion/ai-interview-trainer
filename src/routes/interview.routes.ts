import { Router } from 'express';
import { getActiveSession, startSession, submitAnswer } from '../controllers/interview.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const interviewRouter = Router();

interviewRouter.use(requireAuth);
interviewRouter.get('/active', getActiveSession);
interviewRouter.post('/start', startSession);
interviewRouter.post('/:sessionId/answer', submitAnswer);
