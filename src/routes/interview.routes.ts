import { Router } from 'express';
import { getActiveSession, startSession, submitAnswer } from '../controllers/interview.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { userRateLimit } from '../middleware/rateLimit.js';

// Per user and 15-minute window, shared by /start and /answer (each can cost one or two model
// calls). A full session is 1 start + 5 answers, so this allows several back-to-back sessions
// while stopping a script from using the endpoints as a free model proxy.
const AI_REQUESTS_PER_WINDOW = 40;
const aiRateLimit = userRateLimit('ai', AI_REQUESTS_PER_WINDOW);

export const interviewRouter = Router();

interviewRouter.use(requireAuth);
interviewRouter.get('/active', getActiveSession);
interviewRouter.post('/start', aiRateLimit, startSession);
interviewRouter.post('/:sessionId/answer', aiRateLimit, submitAnswer);
