import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { AddressInfo } from 'net';
import type { Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import type { User } from '../models/User.js';

const users = new Map<string, { tokenVersion?: number; passwordHash?: string }>();

vi.mock('../models/User.js', () => ({
	UserModel: {
		findById: vi.fn(async (id: string) => {
			const user = users.get(id);
			return user ? { id, ...user } : null;
		}),
		findByIdAndUpdate: vi.fn(async (id: string, update: { $inc?: { tokenVersion?: number }; passwordHash?: string }) => {
			const existing = users.get(id) ?? {};
			const inc = update.$inc?.tokenVersion ?? 0;
			const updated = {
				...existing,
				tokenVersion: (existing.tokenVersion ?? 0) + inc,
				...(update.passwordHash !== undefined ? { passwordHash: update.passwordHash } : {}),
			};
			users.set(id, updated);
			return { id, ...updated };
		}),
	},
}));

vi.mock('../services/passwordReset.service.js', () => ({
	verifyAndConsumePasswordResetToken: vi.fn(),
}));

const { issueSession, refreshSession, logout, confirmPasswordReset } = await import('./auth.controller.js');
const { requireAuth } = await import('../middleware/auth.js');
const { verifyAndConsumePasswordResetToken } = await import('../services/passwordReset.service.js');
const { UserModel } = await import('../models/User.js');

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
		// refreshSession only ever runs for a remembered session — the renewed cookie must stay
		// persistent, not silently downgrade to a browser-session cookie.
		expect(tokenCookie).toMatch(/Max-Age=604800/i);
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

	it('missing/expired token cookie but a still-valid refreshToken → still bumps tokenVersion', async () => {
		users.set('user-1', { tokenVersion: 0 });
		const refreshToken = jwt.sign({ userId: 'user-1', tokenVersion: 0 }, 'test-secret', { expiresIn: '7d' });

		const res = await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${refreshToken}` },
		});

		expect(res.status).toBe(200);
		expect(users.get('user-1')?.tokenVersion).toBe(1);
	});

	it('replaying the pre-logout refreshToken against /api/auth/refresh → 401 auth.session_revoked', async () => {
		users.set('user-1', { tokenVersion: 0 });
		const preLogoutRefreshToken = jwt.sign({ userId: 'user-1', tokenVersion: 0 }, 'test-secret', { expiresIn: '7d' });

		await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${preLogoutRefreshToken}` },
		});

		const refreshApp = express();
		refreshApp.use(cookieParser());
		refreshApp.post('/api/auth/refresh', refreshSession);
		const refreshServer = refreshApp.listen(0);
		await new Promise<void>((resolve) => refreshServer.once('listening', resolve));
		const { port } = refreshServer.address() as AddressInfo;

		const replay = await fetch(`http://127.0.0.1:${port}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${preLogoutRefreshToken}` },
		});

		expect(replay.status).toBe(401);
		await expect(replay.json()).resolves.toEqual({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});

		await new Promise<void>((resolve) => refreshServer.close(() => resolve()));
	});
});

describe('confirmPasswordReset (integration, mounted on POST /api/auth/password-reset/confirm)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;
	const VALID_TOKEN = 'a'.repeat(64);

	beforeEach(async () => {
		users.clear();
		vi.mocked(verifyAndConsumePasswordResetToken).mockReset();
		vi.mocked(UserModel.findByIdAndUpdate).mockClear();

		const app = express();
		app.use(express.json());
		app.post('/api/auth/password-reset/confirm', confirmPasswordReset);

		server = app.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		const { port } = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	// AC-01/AC-06 (PRD): valid, unexpired, unused token + valid newPassword → consumes the token,
	// hashes + stores newPassword on the found user, bumps tokenVersion by 1, responds 200 per
	// openapi.yaml's ConfirmPasswordResetResponse.
	it('valid token + valid newPassword (>=8 chars) → hashes password, bumps tokenVersion, 200 {message}', async () => {
		users.set('user-1', { tokenVersion: 2 });
		vi.mocked(verifyAndConsumePasswordResetToken).mockResolvedValueOnce({
			status: 'valid',
			userId: 'user-1' as unknown as import('mongoose').Types.ObjectId,
		});

		const res = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: VALID_TOKEN, newPassword: 'new-correct-horse' }),
		});

		expect(res.status).toBe(200);
		const body = (await res.json()) as { message: string };
		expect(typeof body.message).toBe('string');

		expect(verifyAndConsumePasswordResetToken).toHaveBeenCalledWith(VALID_TOKEN);
		expect(UserModel.findByIdAndUpdate).toHaveBeenCalled();
		const updated = users.get('user-1');
		expect(updated?.tokenVersion).toBe(3);
		expect(updated?.passwordHash).toBeDefined();
		await expect(bcrypt.compare('new-correct-horse', updated!.passwordHash!)).resolves.toBe(true);
	});

	// AC-03 (PRD): missing/expired/already-used token → 400 with the Error schema's
	// password_reset.invalid_or_expired_token code, and no password/tokenVersion write happens.
	it('invalid/expired token → 400 {code: password_reset.invalid_or_expired_token}, no user write', async () => {
		users.set('user-1', { tokenVersion: 2 });
		vi.mocked(verifyAndConsumePasswordResetToken).mockResolvedValueOnce({ status: 'invalid' });

		const res = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: VALID_TOKEN, newPassword: 'new-correct-horse' }),
		});

		expect(res.status).toBe(400);
		const body = (await res.json()) as { code: string; message: string };
		expect(body.code).toBe('password_reset.invalid_or_expired_token');
		expect(typeof body.message).toBe('string');

		expect(UserModel.findByIdAndUpdate).not.toHaveBeenCalled();
		expect(users.get('user-1')?.tokenVersion).toBe(2);
	});

	// Story Scope: newPassword validated against PASSWORD_MIN_LENGTH (8), matching register — and
	// the token must not be burned by a too-short password, since it's single-use.
	it('newPassword shorter than 8 chars → 400, token is never consumed', async () => {
		const res = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: VALID_TOKEN, newPassword: 'short1' }),
		});

		expect(res.status).toBe(400);
		expect(verifyAndConsumePasswordResetToken).not.toHaveBeenCalled();
	});

	// Story DoD: request shape matches openapi.yaml's ConfirmPasswordResetBody — both fields required.
	it('missing token in body → 400', async () => {
		const res = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ newPassword: 'new-correct-horse' }),
		});

		expect(res.status).toBe(400);
		expect(verifyAndConsumePasswordResetToken).not.toHaveBeenCalled();
	});

	it('missing newPassword in body → 400', async () => {
		const res = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: VALID_TOKEN }),
		});

		expect(res.status).toBe(400);
		expect(verifyAndConsumePasswordResetToken).not.toHaveBeenCalled();
	});
});
