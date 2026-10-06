import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { InterviewSessionModel, LANGS, LEVELS, TOPICS } from '../models/InterviewSession.js';
import type { Lang } from '../models/InterviewSession.js';
import { answerQuestion, generateQuestion, reviewAnswer } from '../services/ai.service.js';
import type { AnswerReview } from '../services/ai.service.js';

const QUESTIONS_PER_SESSION = 5;
const DEFAULT_LANG: Lang = 'uk';
// A generated question is a few sentences (max_tokens 300); an answer is free text, but not a document.
const MAX_QUESTION_LENGTH = 1000;
const MAX_ANSWER_LENGTH = 4000;

export async function startSession(req: AuthedRequest, res: Response): Promise<void> {
	const { topic, level, lang } = req.body as { topic?: string; level?: string; lang?: unknown };
	if (!topic || !TOPICS.includes(topic as (typeof TOPICS)[number])) {
		res.status(400).json({ error: `topic must be one of: ${TOPICS.join(', ')}` });
		return;
	}
	if (!level || !LEVELS.includes(level as (typeof LEVELS)[number])) {
		res.status(400).json({ error: `level must be one of: ${LEVELS.join(', ')}` });
		return;
	}

	if (lang !== undefined && !LANGS.includes(lang as Lang)) {
		res.status(400).json({ error: `lang must be one of: ${LANGS.join(', ')}` });
		return;
	}
	const sessionLang: Lang = (lang as Lang | undefined) ?? DEFAULT_LANG;

	// The question is stored on the session, so it has to exist before the document is created.
	// A failed AI call also no longer leaves an empty in_progress session behind.
	const { question } = await generateQuestion(topic, level, [], sessionLang);
	const session = await InterviewSessionModel.create({
		userId: req.userId,
		topic,
		level,
		lang: sessionLang,
		currentQuestion: question,
		questions: [],
	});

	res.status(201).json({
		sessionId: session.id,
		questionIndex: 0,
		totalQuestions: QUESTIONS_PER_SESSION,
		question,
	});
}

export async function getActiveSession(req: AuthedRequest, res: Response): Promise<void> {
	const session = await InterviewSessionModel.findOne({
		userId: req.userId,
		status: 'in_progress',
	}).sort({ createdAt: -1 });

	if (!session) {
		res.status(204).end();
		return;
	}

	let question = session.currentQuestion;
	if (!question) {
		// Session created before currentQuestion existed: generate once and keep it, so a reload
		// neither pays for another question nor shows one the later answer wouldn't match.
		const askedQuestions = session.questions.map((q) => q.question);
		question = (
			await generateQuestion(session.topic, session.level, askedQuestions, session.lang ?? DEFAULT_LANG)
		).question;
		session.currentQuestion = question;
		await session.save();
	}

	res.json({
		sessionId: session.id,
		topic: session.topic,
		level: session.level,
		questionIndex: session.questions.length,
		totalQuestions: QUESTIONS_PER_SESSION,
		question,
	});
}

export async function submitAnswer(req: AuthedRequest, res: Response): Promise<void> {
	const { sessionId } = req.params;
	const { question, answer } = req.body as { question?: unknown; answer?: unknown };
	if (typeof question !== 'string' || !question || typeof answer !== 'string') {
		res.status(400).json({ error: 'question and answer are required strings' });
		return;
	}
	if (question.length > MAX_QUESTION_LENGTH || answer.length > MAX_ANSWER_LENGTH) {
		res.status(400).json({
			error: `question must be at most ${MAX_QUESTION_LENGTH} and answer at most ${MAX_ANSWER_LENGTH} characters`,
		});
		return;
	}

	const session = await InterviewSessionModel.findOne({ _id: sessionId, userId: req.userId });
	if (!session) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}
	if (session.status === 'completed') {
		res.status(409).json({ error: 'Session is already complete - start a new one' });
		return;
	}
	// Only the question the server issued may be answered; otherwise the endpoint would grade
	// (and the model would answer) any text the client sends.
	if (session.currentQuestion && session.currentQuestion !== question) {
		res.status(400).json({ error: 'question does not match the current question of this session' });
		return;
	}

	const isLastQuestion = session.questions.length + 1 >= QUESTIONS_PER_SESSION;
	const askedQuestions = session.questions.map((q) => q.question).concat(question);

	// "Не знаю" надсилає порожню відповідь: модель лише відповідає на питання, а оцінка не рахується.
	const skipped = answer.trim() === '';
	const storedAnswer = skipped ? '' : answer;
	const lang: Lang = session.lang ?? DEFAULT_LANG;

	const [review, nextQuestion] = await Promise.all([
		skipped
			? answerQuestion(session.topic, session.level, question, lang).then(
					(correctAnswer): AnswerReview => ({ score: 0, feedback: '', correctAnswer, weakTopics: [] }),
				)
			: reviewAnswer(session.topic, session.level, question, answer, lang),
		isLastQuestion
			? Promise.resolve(undefined)
			: generateQuestion(session.topic, session.level, askedQuestions, lang),
	]);

	session.questions.push({
		question,
		answer: storedAnswer,
		score: review.score,
		feedback: review.feedback,
		correctAnswer: review.correctAnswer,
		weakTopics: review.weakTopics,
	});
	session.currentQuestion = nextQuestion?.question;

	if (isLastQuestion) {
		const scored = session.questions.filter((q) => q.answer !== '');
		const total = scored.reduce((sum, q) => sum + q.score, 0);
		session.averageScore = scored.length ? total / scored.length : 0;
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

	res.json({
		review,
		done: false,
		questionIndex: session.questions.length,
		totalQuestions: QUESTIONS_PER_SESSION,
		question: nextQuestion?.question,
	});
}
