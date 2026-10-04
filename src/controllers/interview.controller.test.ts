import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';

interface StoredQuestion {
	question: string;
	answer: string;
	score: number;
	feedback: string;
	correctAnswer: string;
	weakTopics: string[];
}

interface FakeSession {
	status: 'in_progress' | 'completed';
	topic: string;
	level: string;
	questions: StoredQuestion[];
	averageScore?: number;
	completedAt?: Date;
	save: ReturnType<typeof vi.fn>;
}

const { findOne, reviewAnswer, answerQuestion, generateQuestion } = vi.hoisted(() => ({
	findOne: vi.fn(),
	reviewAnswer: vi.fn(),
	answerQuestion: vi.fn(),
	generateQuestion: vi.fn(),
}));

vi.mock('../models/InterviewSession.js', () => ({
	InterviewSessionModel: { findOne },
	TOPICS: ['react'],
	LEVELS: ['junior'],
}));

vi.mock('../services/ai.service.js', () => ({ reviewAnswer, answerQuestion, generateQuestion }));

const { submitAnswer } = await import('./interview.controller.js');

function answered(score: number): StoredQuestion {
	return { question: 'q', answer: 'some answer', score, feedback: 'f', correctAnswer: 'c', weakTopics: [] };
}

function skippedEntry(): StoredQuestion {
	return { question: 'q', answer: '', score: 0, feedback: '', correctAnswer: 'c', weakTopics: [] };
}

function makeSession(questions: StoredQuestion[] = []): FakeSession {
	return {
		status: 'in_progress',
		topic: 'react',
		level: 'junior',
		questions,
		save: vi.fn(async () => undefined),
	};
}

async function submit(answer: string) {
	const req = { params: { sessionId: 's1' }, body: { question: 'What is X?', answer }, userId: 'u1' };
	const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
	await submitAnswer(req as unknown as AuthedRequest, res as unknown as Response);
	return res;
}

describe('submitAnswer — skipped question ("Не знаю")', () => {
	beforeEach(() => {
		findOne.mockReset();
		reviewAnswer.mockReset().mockResolvedValue({
			score: 8,
			feedback: 'good',
			correctAnswer: 'ideal',
			weakTopics: ['x'],
		});
		answerQuestion.mockReset().mockResolvedValue('model answer');
		generateQuestion.mockReset().mockResolvedValue({ question: 'next?' });
	});

	it('answers the question without reviewing and stores it as a zero-score skip', async () => {
		const session = makeSession();
		findOne.mockResolvedValue(session);

		const res = await submit('');

		expect(answerQuestion).toHaveBeenCalledWith('react', 'junior', 'What is X?');
		expect(reviewAnswer).not.toHaveBeenCalled();
		expect(session.questions).toEqual([
			{ question: 'What is X?', answer: '', score: 0, feedback: '', correctAnswer: 'model answer', weakTopics: [] },
		]);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				review: { score: 0, feedback: '', correctAnswer: 'model answer', weakTopics: [] },
				done: false,
				question: 'next?',
			}),
		);
	});

	it('treats a whitespace-only answer as a skip and stores it as an empty string', async () => {
		const session = makeSession();
		findOne.mockResolvedValue(session);

		await submit('   ');

		expect(answerQuestion).toHaveBeenCalledTimes(1);
		expect(reviewAnswer).not.toHaveBeenCalled();
		expect(session.questions[0]?.answer).toBe('');
	});

	it('reviews a real answer and does not call answerQuestion', async () => {
		const session = makeSession();
		findOne.mockResolvedValue(session);

		await submit('my answer');

		expect(reviewAnswer).toHaveBeenCalledWith('react', 'junior', 'What is X?', 'my answer');
		expect(answerQuestion).not.toHaveBeenCalled();
		expect(session.questions[0]).toMatchObject({ answer: 'my answer', score: 8 });
	});

	it('leaves skipped questions out of the final averageScore', async () => {
		// 4 prior: answered 8, skipped, answered 6, skipped; the 5th is skipped too → average of 8 and 6.
		const session = makeSession([answered(8), skippedEntry(), answered(6), skippedEntry()]);
		findOne.mockResolvedValue(session);

		const res = await submit('');

		expect(session.averageScore).toBe(7);
		expect(session.status).toBe('completed');
		expect(res.json).toHaveBeenCalledWith({
			review: expect.objectContaining({ score: 0 }),
			done: true,
			averageScore: 7,
		});
	});

	it('averages over the answered questions when the last one is answered', async () => {
		const session = makeSession([skippedEntry(), skippedEntry(), skippedEntry(), answered(4)]);
		findOne.mockResolvedValue(session);

		await submit('final answer');

		// answered: 4 (prior) and 8 (the final review) → 6; the three skips don't count.
		expect(session.averageScore).toBe(6);
	});

	it('gives averageScore 0 when every question was skipped', async () => {
		const session = makeSession([skippedEntry(), skippedEntry(), skippedEntry(), skippedEntry()]);
		findOne.mockResolvedValue(session);

		await submit('');

		expect(session.averageScore).toBe(0);
	});
});
