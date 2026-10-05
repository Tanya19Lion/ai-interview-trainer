import type { NextFunction, Request, Response } from 'express';
import { reserveIpAttempt } from '../services/ipAttempt.service.js';
import { reserveLoginAttempt } from '../services/loginAttempt.service.js';

export async function loginRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
	const { email } = req.body as { email?: unknown };
	// A non-string email never reaches reserveLoginAttempt's Mongo filter; login() answers it with 400.
	if (typeof email !== 'string' || !email) {
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

/** Per-IP throttle for the endpoints that have no email-keyed limit of their own (register, Google). */
export function ipRateLimit(scope: string, maxAttempts: number) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		if (!(await reserveIpAttempt(`${scope}:${req.ip}`, maxAttempts))) {
			res.status(429).json({
				code: 'auth.rate_limited',
				message: 'Too many requests from this address. Try again later.',
			});
			return;
		}
		next();
	};
}
