import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create };
	},
}));

const { generateQuestion, answerQuestion, reviewAnswer } = await import('./ai.service.js');

const reviewJson = JSON.stringify({ score: 5, feedback: 'f', correctAnswer: 'c', weakTopics: [] });

describe('AI session language', () => {
	beforeEach(() => {
		process.env.ANTHROPIC_API_KEY = 'test-key';
		create.mockReset();
	});

	it.each([
		['uk', 'Ukrainian'],
		['en', 'English'],
	] as const)('generateQuestion asks for %s', async (lang, name) => {
		create.mockResolvedValue({ content: [{ type: 'text', text: 'q?' }] });

		await generateQuestion('react', 'junior', [], lang);

		expect(create.mock.calls[0][0].system).toContain(`Write your entire response in ${name}.`);
	});

	it('answerQuestion asks for the session language', async () => {
		create.mockResolvedValue({ content: [{ type: 'text', text: 'a' }] });

		await answerQuestion('react', 'junior', 'What is X?', 'en');

		expect(create.mock.calls[0][0].system).toContain('Write your entire response in English.');
	});

	it('reviewAnswer asks for the session language while keeping the JSON keys', async () => {
		create.mockResolvedValue({ content: [{ type: 'text', text: reviewJson }] });

		await reviewAnswer('react', 'junior', 'What is X?', 'my answer', 'en');

		const system: string = create.mock.calls[0][0].system;
		expect(system).toContain('Write your entire response in English.');
		expect(system).toContain('"score"');
		expect(system).toContain('JSON keys must stay exactly as specified');
	});
});
