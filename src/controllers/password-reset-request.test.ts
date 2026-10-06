import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

interface StoredUser {
	email: string;
	passwordHash?: string;
	googleId?: string;
}

const users = new Map<string, StoredUser>();

vi.mock('../models/User.js', () => ({
	UserModel: {
		findOne: vi.fn(async ({ email }: { email: string }) => {
			for (const [id, user] of users) {
				if (user.email === email) return { id, _id: id, ...user };
			}
			return null;
		}),
	},
}));

vi.mock('../services/loginAttempt.service.js', () => ({
	reserveLoginAttempt: vi.fn(async () => true),
	releaseLoginAttempt: vi.fn(),
}));

const reserveIpAttempt = vi.fn();

vi.mock('../services/ipAttempt.service.js', () => ({
	reserveIpAttempt,
	releaseIpAttempt: vi.fn(),
}));

const reserveResetRequest = vi.fn();
const releaseResetRequest = vi.fn();
const issuePasswordReset = vi.fn();
const sendResetEmail = vi.fn();

vi.mock('../services/passwordReset.service.js', () => ({
	verifyAndConsumePasswordResetToken: vi.fn(),
	reserveResetRequest,
	releaseResetRequest,
	issuePasswordReset,
	sendResetEmail,
}));

const { authRouter } = await import('../routes/auth.routes.js');

const GENERIC_MESSAGE = 'If that email is registered, a reset link has been sent.';

// T6 (PRD AC-01, AC-02, AC-05): drives the real authRouter; only the models and the
// passwordReset service are faked.
describe('POST /api/auth/password-reset/request (T6)', () => {
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
		users.clear();
		users.set('user-1', { email: 'local@example.test', passwordHash: 'hash' });
		users.set('user-2', { email: 'google@example.test', googleId: 'g-123' });
		reserveIpAttempt.mockReset().mockResolvedValue(true);
		reserveResetRequest.mockReset().mockResolvedValue({ allowed: true, attemptsRemaining: 2 });
		releaseResetRequest.mockReset().mockResolvedValue(undefined);
		issuePasswordReset.mockReset().mockResolvedValue({ status: 'issued', token: 'raw-token' });
		sendResetEmail.mockReset().mockResolvedValue(undefined);
	});

	function request(body: unknown) {
		return fetch(`${baseUrl}/api/auth/password-reset/request`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
	}

	it('issues a token and emails the link for a known Local account (AC-01)', async () => {
		const res = await request({ email: 'local@example.test' });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ message: GENERIC_MESSAGE, attemptsRemaining: 2 });
		expect(issuePasswordReset).toHaveBeenCalledWith('user-1');
		expect(sendResetEmail).toHaveBeenCalledWith('local@example.test', 'raw-token');
	});

	it('answers an unknown email with exactly the same body and sends nothing (AC-02)', async () => {
		const known = await (await request({ email: 'local@example.test' })).json();

		const res = await request({ email: 'nobody@example.test' });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(known);
		expect(issuePasswordReset).toHaveBeenCalledTimes(1);
		expect(sendResetEmail).toHaveBeenCalledTimes(1);
	});

	it('answers a Google-only account with the google_account hint and issues no token (AC-05)', async () => {
		const res = await request({ email: 'google@example.test' });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			message: 'This account signs in with Google. Use "Sign in with Google" instead.',
			hint: 'google_account',
		});
		expect(issuePasswordReset).not.toHaveBeenCalled();
		expect(sendResetEmail).not.toHaveBeenCalled();
	});

	it('answers 429 over the limit, the same for a known and an unknown email', async () => {
		reserveResetRequest.mockResolvedValue({ allowed: false, attemptsRemaining: 0 });

		const known = await request({ email: 'local@example.test' });
		const unknown = await request({ email: 'nobody@example.test' });

		expect(known.status).toBe(429);
		expect(unknown.status).toBe(429);
		expect(await known.json()).toEqual({
			code: 'password_reset.rate_limited',
			message: 'Too many reset requests for this email. Try again later.',
		});
		expect(await unknown.json()).toEqual({
			code: 'password_reset.rate_limited',
			message: 'Too many reset requests for this email. Try again later.',
		});
		expect(issuePasswordReset).not.toHaveBeenCalled();
	});

	it('answers the generic 200 without sending when the issuing limit trips but the counter allows it', async () => {
		issuePasswordReset.mockResolvedValue({ status: 'rate_limited', attemptsRemaining: 0 });

		const res = await request({ email: 'local@example.test' });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ message: GENERIC_MESSAGE, attemptsRemaining: 2 });
		expect(sendResetEmail).not.toHaveBeenCalled();
	});

	it('answers the generic 200 when sending fails, so a delivery error does not reveal the account', async () => {
		sendResetEmail.mockRejectedValue(new Error('Resend responded with 500'));
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const res = await request({ email: 'local@example.test' });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ message: GENERIC_MESSAGE, attemptsRemaining: 2 });
		expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('raw-token');
		errorSpy.mockRestore();
	});

	it('gives the attempt back when sending fails, so our failure does not use up the hour', async () => {
		sendResetEmail.mockRejectedValue(new Error('Resend responded with 422'));
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await request({ email: 'local@example.test' });

		expect(releaseResetRequest).toHaveBeenCalledWith('local@example.test');
		errorSpy.mockRestore();
	});

	it('keeps the attempt when the email was sent, and when the issuing limit stopped it', async () => {
		await request({ email: 'local@example.test' });
		issuePasswordReset.mockResolvedValue({ status: 'rate_limited', attemptsRemaining: 0 });
		await request({ email: 'local@example.test' });

		expect(releaseResetRequest).not.toHaveBeenCalled();
	});

	it('answers 429 when the address is over its own limit, before counting or looking up the email', async () => {
		reserveIpAttempt.mockResolvedValue(false);

		const res = await request({ email: 'local@example.test' });

		expect(res.status).toBe(429);
		expect(((await res.json()) as { code: string }).code).toBe('auth.rate_limited');
		expect(reserveIpAttempt).toHaveBeenCalledWith(expect.stringMatching(/^password-reset:/), expect.any(Number));
		expect(reserveResetRequest).not.toHaveBeenCalled();
		expect(sendResetEmail).not.toHaveBeenCalled();
	});

	it.each([{}, { email: '' }, { email: 42 }, { email: { $ne: '' } }])('rejects a body without a string email: %j', async (body) => {
		const res = await request(body);

		expect(res.status).toBe(400);
		expect(((await res.json()) as { code: string }).code).toBe('password_reset.invalid_request');
		expect(reserveResetRequest).not.toHaveBeenCalled();
	});
});
