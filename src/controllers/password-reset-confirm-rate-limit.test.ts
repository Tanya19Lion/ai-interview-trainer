import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

vi.mock('../models/User.js', () => ({ UserModel: { findOne: vi.fn(), findById: vi.fn(), findByIdAndUpdate: vi.fn() } }));

vi.mock('../services/loginAttempt.service.js', () => ({
	reserveLoginAttempt: vi.fn(async () => true),
	releaseLoginAttempt: vi.fn(),
}));

const reserveIpAttempt = vi.fn();

vi.mock('../services/ipAttempt.service.js', () => ({
	reserveIpAttempt,
	releaseIpAttempt: vi.fn(),
}));

const verifyAndConsumePasswordResetToken = vi.fn();

vi.mock('../services/passwordReset.service.js', () => ({
	verifyAndConsumePasswordResetToken,
	reserveResetRequest: vi.fn(),
	releaseResetRequest: vi.fn(),
	issuePasswordReset: vi.fn(),
	sendResetEmail: vi.fn(),
}));

const { authRouter } = await import('../routes/auth.routes.js');

// T17: the confirm route is unauthenticated and every call costs a hash plus a Mongo write, so it
// is limited per IP like /register. The token itself is 256 bits, so this is about load, not guessing.
describe('POST /api/auth/password-reset/confirm — per-IP rate limit (T17)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;

	beforeAll(async () => {
		const app = express();
		app.use(express.json());
		app.use('/api/auth', authRouter);

		server = app.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	beforeEach(() => {
		reserveIpAttempt.mockReset().mockResolvedValue(true);
		verifyAndConsumePasswordResetToken.mockReset().mockResolvedValue({ status: 'invalid' });
	});

	function confirm(body: unknown) {
		return fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
	}

	it('answers 429 over the limit, before touching the token store', async () => {
		reserveIpAttempt.mockResolvedValue(false);

		const res = await confirm({ token: 'a'.repeat(64), newPassword: 'new-password-1' });

		expect(res.status).toBe(429);
		expect(((await res.json()) as { code: string }).code).toBe('auth.rate_limited');
		expect(verifyAndConsumePasswordResetToken).not.toHaveBeenCalled();
	});

	it('counts under its own key, separate from the reset-request limit', async () => {
		await confirm({ token: 'a'.repeat(64), newPassword: 'new-password-1' });

		expect(reserveIpAttempt).toHaveBeenCalledWith(expect.stringMatching(/^password-reset-confirm:/), expect.any(Number));
	});

	it('lets a user under the limit retry after a typo and still reach the endpoint', async () => {
		const tooShort = await confirm({ token: 'a'.repeat(64), newPassword: 'short' });
		const retry = await confirm({ token: 'a'.repeat(64), newPassword: 'long-enough-1' });

		expect(tooShort.status).toBe(400);
		expect(retry.status).toBe(400);
		expect(((await retry.json()) as { code: string }).code).toBe('password_reset.invalid_or_expired_token');
	});
});
