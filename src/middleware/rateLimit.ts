import type { NextFunction, Request, Response } from 'express';
import { reserveLoginAttempt } from '../services/loginAttempt.service.js';

export async function loginRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: string };
	if (!email) {
		next();
		return;
	}

	if (!(await reserveLoginAttempt(email))) {
		res.status(429).json({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
		return;
	}

	next();
}
