import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { AddressInfo } from 'net';
import type { Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import type { User } from '../models/User.js';

const users = new Map<string, { tokenVersion?: number }>();

vi.mock('../models/User.js', () => ({
	UserModel: {
		findById: vi.fn(async (id: string) => {
			const user = users.get(id);
			return user ? { id, ...user } : null;
		}),
		findByIdAndUpdate: vi.fn(async (id: string, update: { $inc?: { tokenVersion?: number } }) => {
			const existing = users.get(id) ?? {};
			const inc = update.$inc?.tokenVersion ?? 0;
			const updated = { ...existing, tokenVersion: (existing.tokenVersion ?? 0) + inc };
			users.set(id, updated);
			return { id, ...updated };
		}),
	},
}));

const { issueSession, refreshSession, logout } = await import('./auth.controller.js');
const { requireAuth } = await import('../middleware/auth.js');

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

function makeRefreshToken(userId: string, tokenVersion: number, expiresIn: jwt.SignOptions['expiresIn'] = '7d') {
	return jwt.sign({ userId, tokenVersion }, 'test-secret', { expiresIn });
}

describe('refreshSession (integration, mounted on POST /api/auth/refresh)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;

	beforeEach(async () => {
		process.env.JWT_SECRET = 'test-secret';
		users.clear();

		const app = express();
		app.use(express.json());
		app.use(cookieParser());
		app.post('/api/auth/refresh', refreshSession);

		server = app.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		const { port } = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('no refreshToken cookie → 401 auth.refresh_token_expired', async () => {
		const res = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST' });

		expect(res.status).toBe(401);
		await expect(res.json()).resolves.toEqual({
			code: 'auth.refresh_token_expired',
			message: 'Your session has expired. Please sign in again.',
		});
	});

	it('expired refreshToken → 401 auth.refresh_token_expired', async () => {
		users.set('user-1', { tokenVersion: 0 });
		const expired = makeRefreshToken('user-1', 0, -1);

		const res = await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${expired}` },
		});

		expect(res.status).toBe(401);
		await expect(res.json()).resolves.toEqual({
			code: 'auth.refresh_token_expired',
			message: 'Your session has expired. Please sign in again.',
		});
	});

	it('stale tokenVersion (revoked by logout/reset) → 401 auth.session_revoked', async () => {
		users.set('user-1', { tokenVersion: 5 });
		const stale = makeRefreshToken('user-1', 4);

		const res = await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${stale}` },
		});

		expect(res.status).toBe(401);
		await expect(res.json()).resolves.toEqual({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});
	});

	it('valid refreshToken → 200, renewed token cookie only, refreshToken untouched', async () => {
		users.set('user-1', { tokenVersion: 2 });
		const valid = makeRefreshToken('user-1', 2);

		const res = await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${valid}` },
		});

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ ok: true });

		const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') ?? ''];
		expect(setCookie.some((c) => c.startsWith('token='))).toBe(true);
		expect(setCookie.some((c) => c.startsWith('refreshToken='))).toBe(false);

		const tokenCookie = setCookie.find((c) => c.startsWith('token='))!;
		const tokenValue = tokenCookie.split(';')[0].split('=')[1];
		expect(jwt.decode(tokenValue)).toMatchObject({ userId: 'user-1', tokenVersion: 2 });
	});

	it('QG-3: expiry check never trusts a client-supplied time value', async () => {
		const verifySpy = vi.spyOn(jwt, 'verify');
		users.set('user-1', { tokenVersion: 0 });
		const valid = makeRefreshToken('user-1', 0);

		await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${valid}`, 'X-Client-Time': '2000-01-01T00:00:00Z' },
		});

		expect(verifySpy).toHaveBeenCalled();
		const options = verifySpy.mock.calls[0][2];
		expect(options?.clockTimestamp).toBeUndefined();

		verifySpy.mockRestore();
	});
});

describe('logout (integration, mounted on POST /api/auth/logout + a protected route)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;

	beforeEach(async () => {
		process.env.JWT_SECRET = 'test-secret';
		users.clear();

		const app = express();
		app.use(express.json());
		app.use(cookieParser());
		app.post('/api/auth/logout', logout);
		app.get('/api/protected', requireAuth, (_req, res) => res.json({ ok: true }));

		server = app.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		const { port } = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('valid token cookie → bumps tokenVersion, clears both cookies, 200 ok', async () => {
		users.set('user-1', { tokenVersion: 0 });
		const token = jwt.sign({ userId: 'user-1', tokenVersion: 0 }, 'test-secret');

		const res = await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `token=${token}` },
		});

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ ok: true });
		expect(users.get('user-1')?.tokenVersion).toBe(1);

		const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') ?? ''];
		expect(setCookie.some((c) => c.startsWith('token=;') || c.startsWith('token=,'))).toBe(true);
		expect(setCookie.some((c) => c.startsWith('refreshToken=;') || c.startsWith('refreshToken=,'))).toBe(true);
	});

	it('no token cookie → graceful 200 no-op, does not throw', async () => {
		const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ ok: true });
	});

	it('invalid token cookie → graceful 200 no-op, does not throw', async () => {
		const res = await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: 'token=not-a-real-jwt' },
		});

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ ok: true });
	});

	it('replaying the pre-logout access token against a protected route → 401', async () => {
		users.set('user-1', { tokenVersion: 0 });
		const preLogoutToken = jwt.sign({ userId: 'user-1', tokenVersion: 0 }, 'test-secret');

		await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `token=${preLogoutToken}` },
		});

		const replay = await fetch(`${baseUrl}/api/protected`, {
			headers: { Cookie: `token=${preLogoutToken}` },
		});

		expect(replay.status).toBe(401);
		await expect(replay.json()).resolves.toEqual({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});
	});
});
