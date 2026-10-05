import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';

const { find } = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock('../models/InterviewSession.js', () => ({ InterviewSessionModel: { find } }));

const { getStats } = await import('./stats.controller.js');

function sessionWith(topic: string, questions: { answer: string; score: number }[]) {
	return { topic, completedAt: new Date(), questions };
}

async function stats(sessions: ReturnType<typeof sessionWith>[]) {
	find.mockReturnValue({ select: vi.fn(async () => sessions) });
	const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
	await getStats({ userId: 'u1' } as unknown as AuthedRequest, res as unknown as Response);
	return res.json.mock.calls[0]?.[0];
}

describe('getStats — skipped questions', () => {
	beforeEach(() => find.mockReset());

	it('ignores skipped questions in overallAccuracy and the per-topic accuracy and count', async () => {
		const body = await stats([
			sessionWith('react', [
				{ answer: 'a', score: 10 },
				{ answer: '', score: 0 },
				{ answer: 'b', score: 6 },
			]),
		]);

		expect(body.overallAccuracy).toBeCloseTo(0.8);
		expect(body.byTopic).toEqual([{ topic: 'react', accuracy: expect.closeTo(0.8), count: 2 }]);
	});

	it('returns a null overallAccuracy and no topics when every question was skipped', async () => {
		const body = await stats([sessionWith('css', [{ answer: '', score: 0 }, { answer: '', score: 0 }])]);

		expect(body.totalSessions).toBe(1);
		expect(body.overallAccuracy).toBeNull();
		expect(body.byTopic).toEqual([]);
	});
});

describe('getStats — activityByDay and today', () => {
	beforeEach(() => {
		find.mockReset();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
	});

	afterEach(() => vi.useRealTimers());

	it('buckets completedAt into UTC calendar days, so the late-evening UTC session stays on its own day', async () => {
		const at = (iso: string) => ({ topic: 'react', completedAt: new Date(iso), questions: [{ answer: 'a', score: 5 }] });
		const body = await stats([at('2026-10-05T00:00:01Z'), at('2026-10-04T23:59:59Z'), at('2026-10-04T08:00:00Z')]);

		expect(body.activityByDay).toEqual({ '2026-10-05': 1, '2026-10-04': 2 });
		expect(body.today).toBe('2026-10-05');
	});

	it('returns an empty activityByDay and today when there are no completed sessions', async () => {
		const body = await stats([]);

		expect(body.activityByDay).toEqual({});
		expect(body.today).toBe('2026-10-05');
	});
});
