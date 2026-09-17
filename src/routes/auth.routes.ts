import { Router } from 'express';
import { confirmPasswordReset, googleLogin, login, logout, me, refreshSession, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/google', googleLogin);
authRouter.post('/register', register);
authRouter.post('/login', loginRateLimit, login);
authRouter.post('/refresh', refreshSession);
authRouter.post('/logout', logout);
authRouter.post('/password-reset/confirm', confirmPasswordReset);
authRouter.get('/me', requireAuth, me);
