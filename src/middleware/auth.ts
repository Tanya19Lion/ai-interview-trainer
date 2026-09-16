import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';

export interface AuthedRequest extends Request {
	userId?: string;
}

/** `User.tokenVersion` is `undefined` for pre-existing users until the Phase 2 backfill runs — treat that as 0. */
export function hasValidTokenVersion(tokenTokenVersion: number, userTokenVersion: number | null | undefined): boolean {
	return tokenTokenVersion === (userTokenVersion ?? 0);
}

/** Shared signature/expiry check for every cookie-borne JWT (access token or refresh token) — the one place that throws on a missing JWT_SECRET or returns undefined on an invalid/expired token, so requireAuth/refreshSession/logout can't drift on this behavior. */
export function verifyToken<T = { userId: string; tokenVersion: number }>(token: string): T | undefined {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET is not set');
	}
	try {
		return jwt.verify(token, secret) as T;
	} catch {
		return undefined;
	}
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
	const token = req.cookies?.token as string | undefined;
	if (!token) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	const payload = verifyToken(token);
	if (!payload) {
		res.status(401).json({ error: 'Invalid or expired token' });
		return;
	}

	const user = await UserModel.findById(payload.userId);
	if (!user || !hasValidTokenVersion(payload.tokenVersion, user.tokenVersion)) {
		res.status(401).json({ code: 'auth.session_revoked', message: 'Your session was ended. Please sign in again.' });
		return;
	}

	req.userId = payload.userId;
	next();
}
