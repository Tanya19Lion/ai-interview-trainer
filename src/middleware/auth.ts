import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
	userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
	const token = req.cookies?.token as string | undefined;
	if (!token) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET is not set');
	}

	try {
		const payload = jwt.verify(token, secret) as { userId: string };
		req.userId = payload.userId;
		next();
	} catch {
		res.status(401).json({ error: 'Invalid or expired token' });
	}
}
