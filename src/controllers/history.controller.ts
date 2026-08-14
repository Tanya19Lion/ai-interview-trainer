import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { InterviewSessionModel } from '../models/InterviewSession.js';

export async function getHistory(req: AuthedRequest, res: Response): Promise<void> {
	const { topic, level } = req.query as { topic?: string; level?: string };

	const filter: Record<string, unknown> = { userId: req.userId, status: 'completed' };
	if (topic) filter.topic = topic;
	if (level) filter.level = level;

	const sessions = await InterviewSessionModel.find(filter).sort({ completedAt: -1 });

	res.json({
		sessions: sessions.map((s) => ({
			id: s.id,
			topic: s.topic,
			level: s.level,
			averageScore: s.averageScore,
			completedAt: s.completedAt,
		})),
	});
}

export async function getSessionDetail(req: AuthedRequest, res: Response): Promise<void> {
	const session = await InterviewSessionModel.findOne({
		_id: req.params.id,
		userId: req.userId,
	});

	if (!session) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	res.json({
		id: session.id,
		topic: session.topic,
		level: session.level,
		status: session.status,
		averageScore: session.averageScore,
		completedAt: session.completedAt,
		questions: session.questions,
	});
}
