import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store never runs Mongo's TTL sweep on its own — an expired document stays until the code
// under test deletes it.
const store = new Map<string, { count: number; windowStart: Date }>();

vi.mock('../models/IpAttempt.js', () => ({
	IP_ATTEMPT_WINDOW_SECONDS: 900,
	IpAttemptModel: {
		findOneAndUpdate: vi.fn(async (filter: { key: string }) => {
			const existing = store.get(filter.key);
			const attempt = { count: (existing?.count ?? 0) + 1, windowStart: existing?.windowStart ?? new Date() };
			store.set(filter.key, attempt);
			return attempt;
		}),
		deleteOne: vi.fn(async (filter: { key: string; windowStart: { $lt: Date } }) => {
			const existing = store.get(filter.key);
			if (existing && existing.windowStart < filter.windowStart.$lt) store.delete(filter.key);
		}),
	},
}));

const { reserveIpAttempt } = await import('./ipAttempt.service.js');
const { IpAttemptModel } = await import('../models/IpAttempt.js');

const PAST_WINDOW_MS = 15 * 60 * 1000 + 1000;

describe('ipAttempt.service', () => {
	beforeEach(() => {
		store.clear();
		vi.mocked(IpAttemptModel.findOneAndUpdate).mockClear();
	});

	it('allows up to the limit and refuses the next request', async () => {
		const results: boolean[] = [];
		for (let i = 0; i < 4; i++) results.push(await reserveIpAttempt('register:203.0.113.7', 3));

		expect(results).toEqual([true, true, true, false]);
	});

	it('counts keys independently, so one address or scope never uses up another', async () => {
		await reserveIpAttempt('register:203.0.113.7', 1);

		expect(await reserveIpAttempt('register:203.0.113.8', 1)).toBe(true);
		expect(await reserveIpAttempt('google:203.0.113.7', 1)).toBe(true);
	});

	it('starts a fresh window when the stored one is older than 15 minutes, without waiting for the TTL sweep', async () => {
		await reserveIpAttempt('register:203.0.113.7', 1);
		await reserveIpAttempt('register:203.0.113.7', 1);
		store.get('register:203.0.113.7')!.windowStart = new Date(Date.now() - PAST_WINDOW_MS);

		expect(await reserveIpAttempt('register:203.0.113.7', 1)).toBe(true);
	});

	it('retries once as a plain increment when two first requests race on the unique index', async () => {
		vi.mocked(IpAttemptModel.findOneAndUpdate).mockRejectedValueOnce(Object.assign(new Error('E11000'), { code: 11000 }));

		expect(await reserveIpAttempt('register:203.0.113.7', 5)).toBe(true);
		expect(IpAttemptModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
	});

	it('rethrows any other database error', async () => {
		vi.mocked(IpAttemptModel.findOneAndUpdate).mockRejectedValueOnce(new Error('connection lost'));

		await expect(reserveIpAttempt('register:203.0.113.7', 5)).rejects.toThrow('connection lost');
	});
});
