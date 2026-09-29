import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The store never runs Mongo's TTL sweep on its own — an expired document stays until the code
// under test deletes it or ignores it, which is exactly the gap the window tests below exercise.
const store = new Map<string, { count: number; windowStart: Date }>();

vi.mock('../models/LoginAttempt.js', () => ({
	LOGIN_ATTEMPT_WINDOW_SECONDS: 900,
	LoginAttemptModel: {
		findOne: vi.fn(async (filter: { email: string; windowStart: { $gte: Date } }) => {
			const existing = store.get(filter.email);
			return existing && existing.windowStart >= filter.windowStart.$gte ? existing : null;
		}),
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
	},
}));

const { isLoginBlocked, recordFailedLogin } = await import('./loginAttempt.service.js');

const email = 'jobseeker@example.test';

async function failTimes(n: number, who = email) {
	for (let i = 0; i < n; i++) await recordFailedLogin(who);
}

describe('loginAttempt.service', () => {
	beforeEach(() => {
		store.clear();
		vi.useFakeTimers({ toFake: ['Date'] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('an email with no recorded failures is not blocked', async () => {
		await expect(isLoginBlocked(email)).resolves.toBe(false);
	});

	it('allows 5 failed attempts and blocks from the 6th attempt on', async () => {
		await failTimes(4);
		await expect(isLoginBlocked(email)).resolves.toBe(false);

		await failTimes(1);
		await expect(isLoginBlocked(email)).resolves.toBe(true);
	});

	it('failures for one email do not block another', async () => {
		await failTimes(5);

		await expect(isLoginBlocked('someone.else@example.test')).resolves.toBe(false);
	});

	it('lifts the block once 15 minutes have passed, without waiting for the TTL sweep', async () => {
		await failTimes(5);
		vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1000);

		await expect(isLoginBlocked(email)).resolves.toBe(false);
	});

	it('a failure after the window expired starts a fresh window instead of adding to the old count', async () => {
		await failTimes(5);
		vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1000);

		await failTimes(1);

		expect(store.get(email)?.count).toBe(1);
		await expect(isLoginBlocked(email)).resolves.toBe(false);
	});
});
