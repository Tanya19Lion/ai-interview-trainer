import { Router } from 'express';
import { googleLogin, logout, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/google', googleLogin);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
