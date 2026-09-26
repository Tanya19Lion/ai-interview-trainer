import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { AddressInfo } from 'net';

interface StoredUser {
	email: string;
	name: string;
	passwordHash: string;
	tokenVersion: number;
}

const users = new Map<string, StoredUser>();

vi.mock('../models/User.js', () => ({
	UserModel: {
		findOne: vi.fn(async ({ email }: { email: string }) => {
			for (const [id, user] of users) {
				if (user.email === email) {
					return { id, ...user };
				}
			}
			return null;
		}),
		findById: vi.fn(async (id: string) => {
			const user = users.get(id);
			return user ? { id, ...user } : null;
		}),
		findByIdAndUpdate: vi.fn(async (id: string, update: { $inc?: { tokenVersion?: number } }) => {
			const existing = users.get(id);
			if (!existing) {
				return null;
			}
			const updated = { ...existing, tokenVersion: existing.tokenVersion + (update.$inc?.tokenVersion ?? 0) };
			users.set(id, updated);
			return { id, ...updated };
		}),
	},
}));

vi.mock('../models/LoginAttempt.js', () => ({
	LoginAttemptModel: { findOneAndUpdate: vi.fn(async () => ({ count: 1 })) },
}));

vi.mock('../services/passwordReset.service.js', () => ({
	verifyAndConsumePasswordResetToken: vi.fn(),
}));

const { authRouter } = await import('../routes/auth.routes.js');

const EMAIL = 'user@example.test';
const PASSWORD = 'correct-horse-battery';

// QG-1 (SAD §10): log in, capture the access+refresh tokens, log out (bumps tokenVersion),
// replay the captured tokens, assert 401. Drives the real authRouter end-to-end; only the
// Mongoose models are faked.
describe('session revocation (QG-1, integration through authRouter)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;
	let passwordHash: string;

	beforeAll(async () => {
		process.env.JWT_SECRET = 'test-secret';
		passwordHash = await bcrypt.hash(PASSWORD, 4);

		const app = express();
		app.use(express.json());
		app.use(cookieParser());
		app.use('/api/auth', authRouter);

		server = app.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	beforeEach(() => {
		users.clear();
		users.set('user-1', { email: EMAIL, name: 'Test User', passwordHash, tokenVersion: 0 });
	});

	function cookieValue(res: Response, name: string): string {
		const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
		if (!cookie) {
			throw new Error(`no ${name} cookie in response`);
		}
		return cookie.split(';')[0].split('=')[1];
	}

	async function loginRemembered() {
		const res = await fetch(`${baseUrl}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: EMAIL, password: PASSWORD, rememberMe: true }),
		});
		expect(res.status).toBe(200);
		return { token: cookieValue(res, 'token'), refreshToken: cookieValue(res, 'refreshToken') };
	}

	it('before logout, the captured access and refresh tokens are accepted', async () => {
		const { token, refreshToken } = await loginRemembered();

		const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: `token=${token}` } });
		const refresh = await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${refreshToken}` },
		});

		expect(me.status).toBe(200);
		expect(refresh.status).toBe(200);
	});

	it('logout bumps User.tokenVersion, then the replayed access token gets 401 on GET /api/auth/me', async () => {
		const { token, refreshToken } = await loginRemembered();

		const logout = await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `token=${token}; refreshToken=${refreshToken}` },
		});
		expect(logout.status).toBe(200);
		expect(users.get('user-1')?.tokenVersion).toBe(1);

		const replay = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: `token=${token}` } });

		expect(replay.status).toBe(401);
		await expect(replay.json()).resolves.toEqual({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});
	});

	it('logout bumps User.tokenVersion, then the replayed refresh token gets 401 auth.session_revoked on POST /api/auth/refresh', async () => {
		const { token, refreshToken } = await loginRemembered();

		await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `token=${token}; refreshToken=${refreshToken}` },
		});
		expect(users.get('user-1')?.tokenVersion).toBe(1);

		const replay = await fetch(`${baseUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `refreshToken=${refreshToken}` },
		});

		expect(replay.status).toBe(401);
		await expect(replay.json()).resolves.toEqual({
			code: 'auth.session_revoked',
			message: 'Your session was ended. Please sign in again.',
		});
	});
});
