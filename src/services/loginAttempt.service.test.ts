import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The store never runs Mongo's TTL sweep on its own — an expired document stays until the code
// under test deletes it, which is exactly the gap the window tests below exercise.
const store = new Map<string, { count: number; windowStart: Date }>();

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
const PAST_WINDOW_MS = 15 * 60 * 1000 + 1000;

async function reserveTimes(n: number, who = email) {
	const results: boolean[] = [];
	for (let i = 0; i < n; i++) results.push(await reserveLoginAttempt(who));
	return results;
}

describe('loginAttempt.service', () => {
	beforeEach(() => {
		store.clear();
		vi.useFakeTimers({ toFake: ['Date'] });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockClear();
	});

	it('allows 5 attempts and refuses the 6th', async () => {
		const results = await reserveTimes(6);

		expect(results).toEqual([true, true, true, true, true, false]);
	});

	it('of 20 concurrent attempts, exactly 5 are allowed (no check-then-act race)', async () => {
		const results = await Promise.all(Array.from({ length: 20 }, () => reserveLoginAttempt(email)));

		expect(results.filter(Boolean)).toHaveLength(5);
	});

	it('attempts for one email do not use up another email’s allowance', async () => {
		await reserveTimes(6);

		await expect(reserveLoginAttempt('someone.else@example.test')).resolves.toBe(true);
	});

	it('a released attempt (successful login) frees its slot', async () => {
		await reserveTimes(5);

		await releaseLoginAttempt(email);

		await expect(reserveLoginAttempt(email)).resolves.toBe(true);
	});

	it('releasing never takes the count below zero', async () => {
		await releaseLoginAttempt(email);
		await reserveTimes(1);
		await releaseLoginAttempt(email);
		await releaseLoginAttempt(email);

		expect(store.get(email)?.count).toBe(0);
	});

	it('starts a fresh window once 15 minutes have passed, without waiting for the TTL sweep', async () => {
		await reserveTimes(6);
		vi.setSystemTime(Date.now() + PAST_WINDOW_MS);

		await expect(reserveLoginAttempt(email)).resolves.toBe(true);
		expect(store.get(email)?.count).toBe(1);
	});

	it('retries once when two first attempts race on the unique email index (E11000)', async () => {
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockRejectedValueOnce(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

		await expect(reserveLoginAttempt(email)).resolves.toBe(true);
		expect(LoginAttemptModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
	});

	it('does not swallow other database errors', async () => {
		vi.mocked(LoginAttemptModel.findOneAndUpdate).mockRejectedValueOnce(new Error('connection lost'));

		await expect(reserveLoginAttempt(email)).rejects.toThrow('connection lost');
	});
});
