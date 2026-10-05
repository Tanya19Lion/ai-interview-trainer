import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create };
	},
}));

const { reviewAnswer, answerQuestion } = await import('./ai.service.js');

describe('truncated model output', () => {
	beforeEach(() => {
		process.env.ANTHROPIC_API_KEY = 'test-key';
		create.mockReset();
	});

	it('reviewAnswer reports a token-limit cut-off instead of a JSON syntax error', async () => {
		create.mockResolvedValue({
			stop_reason: 'max_tokens',
			content: [{ type: 'text', text: '{\n  "score": 7,\n  "feedback": "Відповідь демонструє' }],
		});

		await expect(reviewAnswer('nextjs', 'middle', 'q?', 'a', 'uk')).rejects.toThrow(/max_tokens/);
	});

	it.each([
		['reviewAnswer', () => reviewAnswer('react', 'junior', 'q?', 'a', 'uk')],
		['answerQuestion', () => answerQuestion('react', 'junior', 'q?', 'uk')],
	])('%s leaves room for a long Ukrainian reply (Cyrillic costs ~2.6 chars per token)', async (_name, call) => {
		create.mockResolvedValue({
			stop_reason: 'end_turn',
			content: [{ type: 'text', text: '{"score":5,"feedback":"f","correctAnswer":"c","weakTopics":[]}' }],
		});

		await call();

		expect(create.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(2048);
	});
});
