import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The store never runs Mongo's TTL sweep on its own — an expired document stays until the code
// under test deletes it, which is exactly the gap the window tests below exercise.
const store = new Map<string, { count: number; windowStart: Date }>();

// The email+address counter is its own service; here it is an in-memory counter with the same
// contract (atomic reserve, release never below zero), so these tests are about how the two combine.
const ipCounts = new Map<string, number>();

vi.mock('./ipAttempt.service.js', () => ({
	reserveIpAttempt: vi.fn(async (key: string, max: number) => {
		const count = (ipCounts.get(key) ?? 0) + 1;
		ipCounts.set(key, count);
		return count <= max;
	}),
	releaseIpAttempt: vi.fn(async (key: string) => {
		const count = ipCounts.get(key) ?? 0;
		if (count > 0) ipCounts.set(key, count - 1);
	}),
}));

vi.mock('../models/LoginAttempt.js', () => ({
	LOGIN_ATTEMPT_WINDOW_SECONDS: 900,
	LoginAttemptModel: {
		findOneAndUpdate: vi.fn(async (filter: { email: string }) => {
			const existing = store.get(filter.email);
			const attempt = { count: (existing?.count ?? 0) + 1, windowStart: existing?.windowStart ?? new Date() };
			store.set(filter.email, attempt);
			return attempt;
		}),
		deleteOne: vi.fn(async (filter: { email: string; windowStart: { $lt: Date } }) => {
			const existing = store.get(filter.email);
			if (existing && existing.windowStart < filter.windowStart.$lt) store.delete(filter.email);
		}),
		updateOne: vi.fn(async (filter: { email: string; count: { $gt: number } }) => {
			const existing = store.get(filter.email);
			if (existing && existing.count > filter.count.$gt) existing.count -= 1;
		}),
	},
}));

const { reserveLoginAttempt, releaseLoginAttempt } = await import('./loginAttempt.service.js');
const { LoginAttemptModel } = await import('../models/LoginAttempt.js');

const email = 'jobseeker@example.test';
const ip = '203.0.113.7';
const PAST_WINDOW_MS = 15 * 60 * 1000 + 1000;
const PER_EMAIL_AND_IP = 5;
const PER_EMAIL = 30;

async function reserveTimes(n: number, who = email, from = ip) {
	const results: boolean[] = [];
	for (let i = 0; i < n; i++) results.push(await reserveLoginAttempt(who, from));
	return results;
}

// One attempt each from n different addresses: the pair counters never fill, only the email ceiling can.
async function reserveFromDistinctAddresses(n: number, who = email, firstHost = 1) {
	const results: boolean[] = [];
	for (let i = 0; i < n; i++) results.push(await reserveLoginAttempt(who, `198.51.100.${firstHost + i}`));
	return results;
}

describe('loginAttempt.service — per email and address', () => {
	beforeEach(() => {
		store.clear();
		ipCounts.clear();
		vi.useFakeTimers({ toFake: ['Date'] });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockClear();
	});

	it('allows 5 attempts from one address for one email and refuses the 6th', async () => {
		const results = await reserveTimes(PER_EMAIL_AND_IP + 1);

		expect(results).toEqual([true, true, true, true, true, false]);
	});

	it('of 20 concurrent attempts from one address, exactly 5 are allowed (no check-then-act race)', async () => {
		const results = await Promise.all(Array.from({ length: 20 }, () => reserveLoginAttempt(email, ip)));

		expect(results.filter(Boolean)).toHaveLength(PER_EMAIL_AND_IP);
	});

	it('failed logins from another address do not lock this address out', async () => {
		await reserveTimes(PER_EMAIL_AND_IP + 3, email, '198.51.100.99');

		await expect(reserveLoginAttempt(email, ip)).resolves.toBe(true);
	});

	it('the same address can still try a different email', async () => {
		await reserveTimes(PER_EMAIL_AND_IP + 1);

		await expect(reserveLoginAttempt('someone.else@example.test', ip)).resolves.toBe(true);
	});

	it('a refused attempt does not use up the email ceiling', async () => {
		await reserveTimes(PER_EMAIL_AND_IP + 4);

		expect(store.get(email)?.count).toBe(PER_EMAIL_AND_IP);
	});

	it('a released attempt (successful login) frees its slot for both counters', async () => {
		await reserveTimes(PER_EMAIL_AND_IP);

		await releaseLoginAttempt(email, ip);

		expect(store.get(email)?.count).toBe(PER_EMAIL_AND_IP - 1);
		await expect(reserveLoginAttempt(email, ip)).resolves.toBe(true);
	});

	it('releasing never takes the counts below zero', async () => {
		await releaseLoginAttempt(email, ip);
		await reserveTimes(1);
		await releaseLoginAttempt(email, ip);
		await releaseLoginAttempt(email, ip);

		expect(store.get(email)?.count).toBe(0);
		expect(ipCounts.get(`login:${email}|${ip}`)).toBe(0);
	});

	it('treats a missing address as one shared "unknown" address instead of failing', async () => {
		const results: boolean[] = [];
		for (let i = 0; i < PER_EMAIL_AND_IP + 1; i++) results.push(await reserveLoginAttempt(email, undefined));

		expect(results).toEqual([true, true, true, true, true, false]);
	});
});

describe('loginAttempt.service — per-email ceiling', () => {
	beforeEach(() => {
		store.clear();
		ipCounts.clear();
		vi.useFakeTimers({ toFake: ['Date'] });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockClear();
	});

	it('refuses the 31st attempt for an email even when every one comes from a different address', async () => {
		const results = await reserveFromDistinctAddresses(PER_EMAIL + 1);

		expect(results.slice(0, PER_EMAIL).every(Boolean)).toBe(true);
		expect(results[PER_EMAIL]).toBe(false);
	});

	it('attempts for one email do not use up another email’s ceiling', async () => {
		await reserveFromDistinctAddresses(PER_EMAIL + 1);

		await expect(reserveLoginAttempt('someone.else@example.test', '198.51.100.250')).resolves.toBe(true);
	});

	it('starts a fresh window once 15 minutes have passed, without waiting for the TTL sweep', async () => {
		await reserveFromDistinctAddresses(PER_EMAIL + 1);
		vi.setSystemTime(Date.now() + PAST_WINDOW_MS);

		await expect(reserveLoginAttempt(email, '198.51.100.200')).resolves.toBe(true);
		expect(store.get(email)?.count).toBe(1);
	});

	it('retries once when two first attempts race on the unique email index (E11000)', async () => {
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockRejectedValueOnce(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

		await expect(reserveLoginAttempt(email, ip)).resolves.toBe(true);
		expect(LoginAttemptModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
	});

	it('does not swallow other database errors', async () => {
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockRejectedValueOnce(new Error('connection lost'));

		await expect(reserveLoginAttempt(email, ip)).rejects.toThrow('connection lost');
	});
});
