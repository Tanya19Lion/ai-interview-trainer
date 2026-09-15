import type { NextFunction, Request, Response } from 'express';
import { LoginAttemptModel } from '../models/LoginAttempt.js';

const MAX_ATTEMPTS_PER_WINDOW = 5;

export async function loginRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: string };
	if (!email) {
		next();
		return;
	}

	const attempt = await LoginAttemptModel.findOneAndUpdate(
		{ email },
		{ $inc: { count: 1 }, $setOnInsert: { windowStart: new Date() } },
		{ upsert: true, new: true },
	);

	if (attempt.count > MAX_ATTEMPTS_PER_WINDOW) {
		res.status(429).json({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
		return;
	}

	next();
}
