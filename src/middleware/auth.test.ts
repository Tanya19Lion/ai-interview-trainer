import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { NextFunction, Response } from 'express';

const users = new Map<string, { tokenVersion?: number }>();

vi.mock('../models/User.js', () => ({
	UserModel: {
		findById: vi.fn(async (id: string) => {
			const user = users.get(id);
			return user ? { ...user } : null;
		}),
	},
}));

const { requireAuth, hasValidTokenVersion } = await import('./auth.js');
const { UserModel } = await import('../models/User.js');

function makeRes() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	} as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function makeToken(userId: string, tokenVersion: number) {
	return jwt.sign({ userId, tokenVersion }, 'test-secret');
}

describe('hasValidTokenVersion', () => {
	it('treats a missing User.tokenVersion as 0', () => {
		expect(hasValidTokenVersion(0, undefined)).toBe(true);
		expect(hasValidTokenVersion(1, undefined)).toBe(false);
	});

	it('passes on a matching tokenVersion, rejects on a stale one', () => {
		expect(hasValidTokenVersion(2, 2)).toBe(true);
		expect(hasValidTokenVersion(1, 2)).toBe(false);
	});
});

describe('requireAuth (unit, mocked UserModel)', () => {
	beforeEach(() => {
		process.env.JWT_SECRET = 'test-secret';
		users.clear();
		vi.mocked(UserModel.findById).mockClear();
	});

	it('calls next() when the token tokenVersion matches User.tokenVersion', async () => {
		users.set('user-1', { tokenVersion: 2 });
		const req = { cookies: { token: makeToken('user-1', 2) } } as unknown as Request;
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await requireAuth(req as never, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it('rejects with 401 auth.session_revoked when the token tokenVersion is stale', async () => {
		users.set('user-1', { tokenVersion: 3 });
		const req = { cookies: { token: makeToken('user-1', 2) } } as unknown as Request;
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await requireAuth(req as never, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});
	});

	it('treats a User with no tokenVersion field the same as tokenVersion 0', async () => {
		users.set('user-1', {});
		const req = { cookies: { token: makeToken('user-1', 0) } } as unknown as Request;
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await requireAuth(req as never, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	// A legacy access-token cookie signed before tokenVersion was added to the JWT payload has no
	// tokenVersion claim at all (payload.tokenVersion === undefined at runtime, despite the type
	// saying number). hasValidTokenVersion only coalesces the User side (?? 0), not the token side,
	// so this fails closed: undefined !== 0 rejects the session, matching every other invalid-auth
	// path's 401 rather than silently trusting an unversioned token.
	it('rejects (fails closed) a token with no tokenVersion claim, even when User.tokenVersion is 0', async () => {
		users.set('user-1', { tokenVersion: 0 });
		const legacyToken = jwt.sign({ userId: 'user-1' }, 'test-secret');
		const req = { cookies: { token: legacyToken } } as unknown as Request;
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await requireAuth(req as never, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});
	});

	it('rejects with 401 "Not authenticated" when no token cookie is present', async () => {
		const req = { cookies: {} } as unknown as Request;
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await requireAuth(req as never, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
		expect(UserModel.findById).not.toHaveBeenCalled();
	});

	it('rejects with 401 "Invalid or expired token" for a malformed/unverifiable token', async () => {
		const req = { cookies: { token: 'not-a-real-jwt' } } as unknown as Request;
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await requireAuth(req as never, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
		expect(UserModel.findById).not.toHaveBeenCalled();
	});
});
