import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';

const { startInterviewSession } = vi.hoisted(() => ({ startInterviewSession: vi.fn() }));
vi.mock('../api/interview', () => ({ startInterviewSession }));

const { NewSessionPage } = await import('./NewSessionPage');

async function startFirstTopicAndLevel() {
	const user = userEvent.setup();
	render(
		<QueryClientProvider client={new QueryClient()}>
			<MemoryRouter>
				<NewSessionPage />
			</MemoryRouter>
		</QueryClientProvider>,
	);
	const [topics, levels] = screen.getAllByRole('radiogroup');
	await user.click(within(topics).getAllByRole('radio')[0]);
	await user.click(within(levels).getAllByRole('radio')[0]);
	await user.click(screen.getByRole('button', { name: /→$/ }));
}

describe('NewSessionPage language', () => {
	afterEach(() => {
		cleanup();
		startInterviewSession.mockReset();
	});

	it.each(['uk', 'en'])('starts the session with the active UI language (%s)', async (lang) => {
		startInterviewSession.mockResolvedValue({ sessionId: 's1', questionIndex: 0, totalQuestions: 5, question: 'q?' });
		await i18n.changeLanguage(lang);

		await startFirstTopicAndLevel();

		expect(startInterviewSession.mock.calls[0][0]).toEqual(expect.objectContaining({ lang }));
	});

	it('does not restart or re-request anything when the UI language changes mid-session', async () => {
		startInterviewSession.mockResolvedValue({ sessionId: 's1', questionIndex: 0, totalQuestions: 5, question: 'q?' });
		await startFirstTopicAndLevel();
		await i18n.changeLanguage('en');

		expect(startInterviewSession).toHaveBeenCalledTimes(1);
	});
});
