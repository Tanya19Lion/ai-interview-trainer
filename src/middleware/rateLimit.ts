import type { NextFunction, Request, Response } from 'express';
import { LOGIN_ATTEMPT_WINDOW_SECONDS, LoginAttemptModel } from '../models/LoginAttempt.js';

const MAX_ATTEMPTS_PER_WINDOW = 5;

export async function loginRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: string };
	if (!email) {
		next();
		return;
	}

	// Mongo's TTL sweep only runs about once a minute, so an expired window can outlive its 15
	// minutes; drop it here so the request path never depends on the sweep's timing.
	await LoginAttemptModel.deleteOne({
		email,
		windowStart: { $lt: new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_SECONDS * 1000) },
	});

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
