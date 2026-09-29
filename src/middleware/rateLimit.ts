import type { NextFunction, Request, Response } from 'express';
import { isLoginBlocked } from '../services/loginAttempt.service.js';

export async function loginRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: string };
	if (!email) {
		next();
		return;
	}

	if (await isLoginBlocked(email)) {
		res.status(429).json({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
		return;
	}

	next();
}
