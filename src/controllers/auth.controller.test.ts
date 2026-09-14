import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { issueSession } from './auth.controller.js';
import type { User } from '../models/User.js';

function makeUser(overrides: Partial<{ id: string; email: string; name: string; avatarUrl: string; tokenVersion: number }> = {}) {
	return {
		id: overrides.id ?? 'user-1',
		email: overrides.email ?? 'jobseeker@example.test',
		name: overrides.name ?? 'Test User',
		avatarUrl: overrides.avatarUrl,
		tokenVersion: overrides.tokenVersion,
	} as unknown as HydratedDocument<User>;
}

function makeRes() {
	return {
		cookie: vi.fn(),
		json: vi.fn(),
	} as unknown as Response & { cookie: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('issueSession', () => {
	beforeEach(() => {
		process.env.JWT_SECRET = 'test-secret';
	});

	it('rememberMe: true signs both an access token and a 7-day refresh token, both embedding tokenVersion', () => {
		const res = makeRes();
		const user = makeUser({ tokenVersion: 3 });

		issueSession(res, user, true);

		expect(res.cookie).toHaveBeenCalledTimes(2);

		const [tokenName, tokenValue, tokenOpts] = res.cookie.mock.calls[0];
		expect(tokenName).toBe('token');
		expect(tokenOpts).toMatchObject({ maxAge: 7 * 24 * 60 * 60 * 1000 });
		expect(jwt.decode(tokenValue as string)).toMatchObject({ userId: 'user-1', tokenVersion: 3 });

		const [refreshName, refreshValue, refreshOpts] = res.cookie.mock.calls[1];
		expect(refreshName).toBe('refreshToken');
		expect(refreshOpts).toMatchObject({ maxAge: 7 * 24 * 60 * 60 * 1000 });
		expect(jwt.decode(refreshValue as string)).toMatchObject({ userId: 'user-1', tokenVersion: 3 });
	});

	it('rememberMe: false/omitted signs only the access token, with no Max-Age on its cookie, and no refresh token', () => {
		const res = makeRes();
		const user = makeUser({ tokenVersion: 0 });

		issueSession(res, user);

		expect(res.cookie).toHaveBeenCalledTimes(1);
		const [tokenName, tokenValue, tokenOpts] = res.cookie.mock.calls[0];
		expect(tokenName).toBe('token');
		expect(tokenOpts).not.toHaveProperty('maxAge');
		expect(jwt.decode(tokenValue as string)).toMatchObject({ userId: 'user-1', tokenVersion: 0 });
	});

	it('treats a missing User.tokenVersion as 0', () => {
		const res = makeRes();
		const user = makeUser();

		issueSession(res, user, true);

		const [, tokenValue] = res.cookie.mock.calls[0];
		expect(jwt.decode(tokenValue as string)).toMatchObject({ tokenVersion: 0 });
	});
});
