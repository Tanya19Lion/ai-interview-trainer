import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create };
	},
}));

const { answerQuestion } = await import('./ai.service.js');

describe('answerQuestion', () => {
	beforeEach(() => {
		process.env.ANTHROPIC_API_KEY = 'test-key';
		create.mockReset();
	});

	it('returns the text blocks joined by newlines, trimmed at both ends (plain text, not JSON)', async () => {
		create.mockResolvedValue({
			content: [
				{ type: 'text', text: '  Перша частина.' },
				{ type: 'text', text: 'Друга частина.\n' },
			],
		});

		await expect(answerQuestion('react', 'junior', 'What is a hook?')).resolves.toBe(
			'Перша частина.\nДруга частина.',
		);
	});

	it('sends the topic, level and question to the model', async () => {
		create.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

		await answerQuestion('react', 'junior', 'What is a hook?');

		const request = create.mock.calls[0]?.[0];
		expect(request.messages[0].content).toContain('Тема: react. Рівень: junior.');
		expect(request.messages[0].content).toContain('What is a hook?');
	});
});
