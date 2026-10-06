import { Router } from 'express';
import { changePassword, confirmPasswordReset, googleLogin, login, logout, me, refreshSession, register, requestPasswordReset } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { ipRateLimit, loginRateLimit } from '../middleware/rateLimit.js';

// Per IP and 15-minute window. Generous enough for a shared office/NAT address, small enough to
// stop scripted account creation.
const IP_ATTEMPTS_PER_WINDOW = 10;

export const authRouter = Router();

authRouter.post('/google', ipRateLimit('google', IP_ATTEMPTS_PER_WINDOW), googleLogin);
authRouter.post('/register', ipRateLimit('register', IP_ATTEMPTS_PER_WINDOW), register);
authRouter.post('/login', loginRateLimit, login);
authRouter.post('/refresh', refreshSession);
authRouter.post('/logout', logout);
authRouter.post('/password-reset/request', ipRateLimit('password-reset', IP_ATTEMPTS_PER_WINDOW), requestPasswordReset);
authRouter.post('/password-reset/confirm', confirmPasswordReset);
authRouter.post('/change-password', requireAuth, changePassword);
authRouter.get('/me', requireAuth, me);
