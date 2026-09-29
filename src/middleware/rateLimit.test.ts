import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../services/loginAttempt.service.js', () => ({
	isLoginBlocked: vi.fn(),
}));

const { isLoginBlocked } = await import('../services/loginAttempt.service.js');
const { loginRateLimit } = await import('./rateLimit.js');

function makeRes() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	} as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('loginRateLimit (unit, mocked loginAttempt.service)', () => {
	beforeEach(() => {
		vi.mocked(isLoginBlocked).mockReset();
	});

	it('calls next() when the email is not blocked', async () => {
		vi.mocked(isLoginBlocked).mockResolvedValueOnce(false);
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await loginRateLimit({ body: { email: 'jobseeker@example.test' } } as Request, res, next);

		expect(isLoginBlocked).toHaveBeenCalledWith('jobseeker@example.test');
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it('rejects a blocked email with 429 auth.rate_limited and does not call next()', async () => {
		vi.mocked(isLoginBlocked).mockResolvedValueOnce(true);
		const res = makeRes();
		const next = vi.fn() as NextFunction;

		await loginRateLimit({ body: { email: 'jobseeker@example.test' } } as Request, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(429);
		expect(res.json).toHaveBeenCalledWith({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
	});

	it('passes through without consulting the limiter when the body has no email', async () => {
		const next = vi.fn() as NextFunction;

		await loginRateLimit({ body: {} } as Request, makeRes(), next);

		expect(isLoginBlocked).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(1);
	});
});

describe('loginRateLimit (integration, mounted on POST /api/auth/login)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;
	let credentialCheckCalls: number;

	beforeEach(async () => {
		vi.mocked(isLoginBlocked).mockReset();
		credentialCheckCalls = 0;

		const app = express();
		app.use(express.json());
		app.post('/api/auth/login', loginRateLimit, (_req, res) => {
			credentialCheckCalls++;
			res.status(401).json({ code: 'auth.invalid_credentials', message: 'Invalid email or password' });
		});

		server = app.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		const { port } = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	function post(email: string) {
		return fetch(`${baseUrl}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password: 'wrong' }),
		});
	}

	it('an unblocked email reaches the credential check', async () => {
		vi.mocked(isLoginBlocked).mockResolvedValueOnce(false);

		const res = await post('ratelimited@example.test');

		expect(res.status).toBe(401);
		expect(credentialCheckCalls).toBe(1);
	});

	it('a blocked email gets 429 before the credential check runs', async () => {
		vi.mocked(isLoginBlocked).mockResolvedValueOnce(true);

		const res = await post('ratelimited@example.test');

		expect(res.status).toBe(429);
		await expect(res.json()).resolves.toEqual({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
		expect(credentialCheckCalls).toBe(0);
	});
});
