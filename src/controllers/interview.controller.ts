import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { InterviewSessionModel, LEVELS, TOPICS } from '../models/InterviewSession.js';
import { generateQuestion, reviewAnswer } from '../services/ai.service.js';

const QUESTIONS_PER_SESSION = 5;

export async function startSession(req: AuthedRequest, res: Response): Promise<void> {
	const { topic, level } = req.body as { topic?: string; level?: string };
	if (!topic || !TOPICS.includes(topic as (typeof TOPICS)[number])) {
		res.status(400).json({ error: `topic must be one of: ${TOPICS.join(', ')}` });
		return;
	}
	if (!level || !LEVELS.includes(level as (typeof LEVELS)[number])) {
		res.status(400).json({ error: `level must be one of: ${LEVELS.join(', ')}` });
		return;
	}

	const session = await InterviewSessionModel.create({
		userId: req.userId,
		topic,
		level,
		questions: [],
	});

	const { question } = await generateQuestion(topic, level, []);

	res.status(201).json({
		sessionId: session.id,
		questionIndex: 0,
		totalQuestions: QUESTIONS_PER_SESSION,
		question,
	});
}

export async function submitAnswer(req: AuthedRequest, res: Response): Promise<void> {
	const { sessionId } = req.params;
	const { question, answer } = req.body as { question?: string; answer?: string };
	if (!question || !answer) {
		res.status(400).json({ error: 'question and answer are required' });
		return;
	}

	const session = await InterviewSessionModel.findOne({ _id: sessionId, userId: req.userId });
	if (!session) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	const review = await reviewAnswer(session.topic, session.level, question, answer);
	session.questions.push({
		question,
		answer,
		score: review.score,
		feedback: review.feedback,
		weakTopics: review.weakTopics,
	});

	const isLastQuestion = session.questions.length >= QUESTIONS_PER_SESSION;

	if (isLastQuestion) {
		const total = session.questions.reduce((sum, q) => sum + q.score, 0);
		session.averageScore = total / session.questions.length;
		session.status = 'completed';
		session.completedAt = new Date();
		await session.save();

		res.json({
			review,
			done: true,
			averageScore: session.averageScore,
		});
		return;
	}

	await session.save();

	const askedQuestions = session.questions.map((q) => q.question);
	const { question: nextQuestion } = await generateQuestion(
		session.topic,
		session.level,
		askedQuestions,
	);

	res.json({
		review,
		done: false,
		questionIndex: session.questions.length,
		totalQuestions: QUESTIONS_PER_SESSION,
		question: nextQuestion,
	});
}
