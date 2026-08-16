import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { InterviewSessionModel } from '../models/InterviewSession.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDayNumber(date: Date): number {
	return Math.floor(date.getTime() / MS_PER_DAY);
}

function computeStreakDays(completedAtDates: Date[]): number {
	const dayNumbers = new Set(completedAtDates.map(toUtcDayNumber));
	const todayDayNumber = toUtcDayNumber(new Date());

	let streakStart: number;
	if (dayNumbers.has(todayDayNumber)) {
		streakStart = todayDayNumber;
	} else if (dayNumbers.has(todayDayNumber - 1)) {
		streakStart = todayDayNumber - 1;
	} else {
		return 0;
	}

	let streak = 0;
	let day = streakStart;
	while (dayNumbers.has(day)) {
		streak += 1;
		day -= 1;
	}
	return streak;
}

export async function getStats(req: AuthedRequest, res: Response): Promise<void> {
	const sessions = await InterviewSessionModel.find({ userId: req.userId, status: 'completed' });

	if (sessions.length === 0) {
		res.json({ totalSessions: 0, overallAccuracy: null, byTopic: [], streakDays: 0 });
		return;
	}

	const byTopic = new Map<string, { total: number; count: number }>();
	let overallTotal = 0;
	let overallCount = 0;

	for (const session of sessions) {
		for (const q of session.questions) {
			const entry = byTopic.get(session.topic) ?? { total: 0, count: 0 };
			entry.total += q.score;
			entry.count += 1;
			byTopic.set(session.topic, entry);
			overallTotal += q.score;
			overallCount += 1;
		}
	}

	const topicStats = Array.from(byTopic.entries()).map(([topic, { total, count }]) => ({
		topic,
		accuracy: total / count / 10,
		count,
	}));

	const streakDays = computeStreakDays(
		sessions.map((s) => s.completedAt).filter((d): d is Date => d !== undefined),
	);

	res.json({
		totalSessions: sessions.length,
		overallAccuracy: overallCount ? overallTotal / overallCount / 10 : null,
		byTopic: topicStats.sort((a, b) => b.accuracy - a.accuracy),
		streakDays,
	});
}
