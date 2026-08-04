import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { InterviewSessionModel } from '../models/InterviewSession.js';

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
	}));

	res.json({
		totalSessions: sessions.length,
		overallAccuracy: overallCount ? overallTotal / overallCount / 10 : null,
		byTopic: topicStats.sort((a, b) => b.accuracy - a.accuracy),
	});
}
