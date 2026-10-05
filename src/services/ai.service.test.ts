import { describe, expect, it } from 'vitest';
import { parseAnswerReview } from './ai.service.js';

describe('parseAnswerReview', () => {
	it('parses a strict JSON response with no fencing', () => {
		const raw = '{"score": 7, "feedback": "ok", "correctAnswer": "x", "weakTopics": []}';
		expect(parseAnswerReview(raw)).toEqual({ score: 7, feedback: 'ok', correctAnswer: 'x', weakTopics: [] });
	});

	it('parses a response wrapped in a ```json code fence', () => {
		const raw = '```json\n{"score": 7, "feedback": "ok", "correctAnswer": "x", "weakTopics": []}\n```';
		expect(parseAnswerReview(raw)).toEqual({ score: 7, feedback: 'ok', correctAnswer: 'x', weakTopics: [] });
	});

	it('parses a response wrapped in a bare ``` code fence', () => {
		const raw = '```\n{"score": 3, "feedback": "meh", "correctAnswer": "y", "weakTopics": ["a"]}\n```';
		expect(parseAnswerReview(raw)).toEqual({
			score: 3,
			feedback: 'meh',
			correctAnswer: 'y',
			weakTopics: ['a'],
		});
	});

	it('throws a diagnostic error (including the raw text) on truncated/invalid JSON', () => {
		const raw = '{"score": 7, "feedback": "still writing the feedback when it got cut';
		expect(() => parseAnswerReview(raw)).toThrow(/still writing the feedback when it got cut/);
	});

	it.each([
		['a score above 10', '{"score": 11, "feedback": "ok", "correctAnswer": "x", "weakTopics": []}'],
		['a negative score', '{"score": -1, "feedback": "ok", "correctAnswer": "x", "weakTopics": []}'],
		['a score that is a string', '{"score": "7", "feedback": "ok", "correctAnswer": "x", "weakTopics": []}'],
		['a missing feedback', '{"score": 7, "correctAnswer": "x", "weakTopics": []}'],
		['an empty correctAnswer', '{"score": 7, "feedback": "ok", "correctAnswer": "", "weakTopics": []}'],
		['weakTopics that is not an array', '{"score": 7, "feedback": "ok", "correctAnswer": "x", "weakTopics": "a"}'],
		['a non-string weakTopics entry', '{"score": 7, "feedback": "ok", "correctAnswer": "x", "weakTopics": [1]}'],
		['a JSON array instead of an object', '[1, 2, 3]'],
		['JSON null', 'null'],
	])('throws an unexpected-shape error for %s, before anything is persisted', (_label, raw) => {
		expect(() => parseAnswerReview(raw)).toThrow(/unexpected shape/);
	});
});
