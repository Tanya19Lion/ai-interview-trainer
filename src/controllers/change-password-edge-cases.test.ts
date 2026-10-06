import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'net';

interface StoredUser {
	email: string;
	name: string;
	passwordHash?: string;
	googleId?: string;
	tokenVersion: number;
}

const users = new Map<string, StoredUser>();
const findByIdAndUpdate = vi.fn();

vi.mock('../models/User.js', () => ({
	UserModel: {
		findOne: vi.fn(async ({ email }: { email: string }) => {
			for (const [id, user] of users) {
				if (user.email === email) return { id, _id: id, ...user };
			}
			return null;
		}),
		findById: vi.fn(async (id: string) => {
			const user = users.get(id);
			return user ? { id, ...user } : null;
		}),
		findByIdAndUpdate,
	},
}));

// The real passwordReset service runs on top of these in-memory model fakes, so "no PasswordReset
// document is created" is checked against what the service actually wrote.
let resetDocs: { userId: string; tokenHash: string }[] = [];
let requestAttempts: { email: string; windowStart: Date; count: number }[] = [];

vi.mock('../models/PasswordReset.js', () => ({
	PasswordResetModel: {
		create: vi.fn(async (data: { userId: string; tokenHash: string }) => {
			resetDocs.push({ userId: data.userId, tokenHash: data.tokenHash });
		}),
		countDocuments: vi.fn(async () => 0),
		findOneAndDelete: vi.fn(async () => null),
	},
}));

vi.mock('../models/ResetRequestAttempt.js', () => ({
	RESET_REQUEST_WINDOW_SECONDS: 3600,
	ResetRequestAttemptModel: {
		deleteOne: vi.fn(async () => undefined),
		findOneAndUpdate: vi.fn(async (filter: { email: string }) => {
			let attempt = requestAttempts.find((a) => a.email === filter.email);
			if (!attempt) {
				attempt = { email: filter.email, windowStart: new Date(), count: 0 };
				requestAttempts.push(attempt);
			}
			attempt.count += 1;
			return attempt;
		}),
		updateOne: vi.fn(async () => undefined),
	},
}));

vi.mock('../services/loginAttempt.service.js', () => ({
	reserveLoginAttempt: vi.fn(async () => true),
	releaseLoginAttempt: vi.fn(),
}));

vi.mock('../services/ipAttempt.service.js', () => ({
	reserveIpAttempt: vi.fn(async () => true),
	releaseIpAttempt: vi.fn(),
}));

const { authRouter } = await import('../routes/auth.routes.js');

const LOCAL_EMAIL = 'local@example.test';
const GOOGLE_EMAIL = 'google@example.test';
const PASSWORD = 'correct-password-123';

describe('change-password and reset-request edge cases (integration through authRouter)', () => {
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
		users.set('local-1', { email: LOCAL_EMAIL, name: 'Local', passwordHash, tokenVersion: 0 });
		users.set('google-1', { email: GOOGLE_EMAIL, name: 'Google', googleId: 'g-123', tokenVersion: 0 });
		resetDocs = [];
		requestAttempts = [];
		findByIdAndUpdate.mockReset();
	});

	function sessionCookieFor(userId: string): string {
		return `token=${jwt.sign({ userId, tokenVersion: 0 }, 'test-secret', { expiresIn: '1h' })}`;
	}

	function post(path: string, body: unknown, cookie?: string) {
		return fetch(`${baseUrl}/api/auth${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
			body: JSON.stringify(body),
		});
	}

	// QG-3 (SAD §10, PRD AC-05): a Google-only account (no passwordHash) is told so at BOTH entry points.
	describe('Google-only account (QG-3, AC-05)', () => {
		it('reset request answers 200 with hint google_account and creates no PasswordReset document', async () => {
			const res = await post('/password-reset/request', { email: GOOGLE_EMAIL });

			expect(res.status).toBe(200);
			expect(((await res.json()) as { hint: string }).hint).toBe('google_account');
			expect(resetDocs).toHaveLength(0);
		});

		it('the same request for an account WITH a password does create a PasswordReset document (control)', async () => {
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const res = await post('/password-reset/request', { email: LOCAL_EMAIL });

			expect(res.status).toBe(200);
			expect(((await res.json()) as { hint?: string }).hint).toBeUndefined();
			expect(resetDocs).toHaveLength(1);
			logSpy.mockRestore();
		});

		it('change-password answers 409 auth.google_account_no_password and changes nothing', async () => {
			const res = await post('/change-password', { currentPassword: 'anything', newPassword: 'new-password-1' }, sessionCookieFor('google-1'));

			expect(res.status).toBe(409);
			expect(((await res.json()) as { code: string }).code).toBe('auth.google_account_no_password');
			expect(findByIdAndUpdate).not.toHaveBeenCalled();
			expect(users.get('google-1')?.tokenVersion).toBe(0);
		});
	});

	// QG-4 (SAD §10, PRD AC-04): a wrong current password is rejected and the stored hash is untouched.
	describe('wrong current password (QG-4, AC-04)', () => {
		it('answers 400 auth.invalid_current_password and leaves passwordHash byte-for-byte unchanged', async () => {
			const before = users.get('local-1')?.passwordHash;

			const res = await post('/change-password', { currentPassword: 'not-the-password', newPassword: 'new-password-1' }, sessionCookieFor('local-1'));

			expect(res.status).toBe(400);
			expect(((await res.json()) as { code: string }).code).toBe('auth.invalid_current_password');
			// Re-read the stored user, not just the response.
			expect(users.get('local-1')?.passwordHash).toBe(before);
			expect(users.get('local-1')?.tokenVersion).toBe(0);
			expect(findByIdAndUpdate).not.toHaveBeenCalled();
		});

		it('the old password still signs in afterwards, so nothing was half-applied', async () => {
			await post('/change-password', { currentPassword: 'not-the-password', newPassword: 'new-password-1' }, sessionCookieFor('local-1'));

			const login = await post('/login', { email: LOCAL_EMAIL, password: PASSWORD });

			expect(login.status).toBe(200);
		});
	});
});
