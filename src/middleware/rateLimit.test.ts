import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { NextFunction, Request, Response } from 'express';

const store = new Map<string, { count: number }>();

vi.mock('../models/LoginAttempt.js', () => ({
	LoginAttemptModel: {
		findOneAndUpdate: vi.fn(async (filter: { email: string }) => {
			const existing = store.get(filter.email);
			const count = (existing?.count ?? 0) + 1;
			store.set(filter.email, { count });
			return { count };
		}),
	},
}));

const { loginRateLimit } = await import('./rateLimit.js');

function makeRes() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	} as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('loginRateLimit (unit, mocked LoginAttemptModel)', () => {
	beforeEach(() => {
		store.clear();
	});

	it('calls next() for the first 5 attempts for an email', async () => {
		const email = 'jobseeker@example.test';
		for (let i = 0; i < 5; i++) {
			const req = { body: { email } } as Request;
			const res = makeRes();
			const next = vi.fn() as NextFunction;

			await loginRateLimit(req, res, next);

			expect(next).toHaveBeenCalledTimes(1);
			expect(res.status).not.toHaveBeenCalled();
		}
	});

	it('rejects the 6th attempt with 429 auth.rate_limited and does not call next()', async () => {
		const email = 'jobseeker@example.test';
		const next = vi.fn() as NextFunction;
		for (let i = 0; i < 5; i++) {
			await loginRateLimit({ body: { email } } as Request, makeRes(), next);
		}

		const res = makeRes();
		const sixthNext = vi.fn() as NextFunction;
		await loginRateLimit({ body: { email } } as Request, res, sixthNext);

		expect(sixthNext).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(429);
		expect(res.json).toHaveBeenCalledWith({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
	});
});

describe('loginRateLimit (integration, mounted on POST /api/auth/login)', () => {
	let server: ReturnType<express.Express['listen']>;
	let baseUrl: string;
	let credentialCheckCalls: number;

	beforeEach(async () => {
		store.clear();
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

	it('passes 5 attempts through to the credential check, then rejects the 6th before it', async () => {
		const email = 'ratelimited@example.test';

		for (let i = 0; i < 5; i++) {
			const res = await fetch(`${baseUrl}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password: 'wrong' }),
			});
			expect(res.status).toBe(401);
		}
		expect(credentialCheckCalls).toBe(5);

		const sixth = await fetch(`${baseUrl}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password: 'wrong' }),
		});

		expect(sixth.status).toBe(429);
		await expect(sixth.json()).resolves.toEqual({
			code: 'auth.rate_limited',
			message: 'Too many login attempts for this email. Try again later.',
		});
		// the 6th request was short-circuited before reaching the credential check
		expect(credentialCheckCalls).toBe(5);
	});

	it('a successful login does not reset or bypass the counter', async () => {
		const email = 'success@example.test';

		const app2 = express();
		app2.use(express.json());
		app2.post('/api/auth/login', loginRateLimit, (_req, res) => {
			credentialCheckCalls++;
			res.status(200).json({ user: { id: '1', email } });
		});
		await new Promise<void>((resolve) => server.close(() => resolve()));
		server = app2.listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		const { port } = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${port}`;

		for (let i = 0; i < 5; i++) {
			const res = await fetch(`${baseUrl}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password: 'correct' }),
			});
			expect(res.status).toBe(200);
		}

		const sixth = await fetch(`${baseUrl}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password: 'correct' }),
		});

		expect(sixth.status).toBe(429);
	});
});
