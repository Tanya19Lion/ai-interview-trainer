import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { ThemeContext } from '../context/theme/ThemeContext';

vi.mock('../api/auth', () => ({ fetchMe: vi.fn() }));

const { fetchMe } = await import('../api/auth');
const { LandingPage } = await import('./LandingPage');

function renderPage() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={queryClient}>
			<ThemeContext.Provider value={{ theme: 'dark', setTheme: vi.fn() }}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</ThemeContext.Provider>
		</QueryClientProvider>,
	);
}

describe('LandingPage auth-aware CTA', () => {
	afterEach(() => cleanup());

	it('offers to log in when the visitor has no session', async () => {
		vi.mocked(fetchMe).mockRejectedValue(new ApiError('not authenticated', 401));
		renderPage();

		expect(await screen.findByRole('link', { name: 'Увійти' })).toHaveAttribute('href', '/login');
		expect(screen.getByRole('link', { name: 'Почати тренування' })).toHaveAttribute('href', '/login');
		expect(screen.queryByRole('link', { name: 'Кабінет' })).not.toBeInTheDocument();
	});

	it('offers to go to the dashboard when the visitor already has a session', async () => {
		vi.mocked(fetchMe).mockResolvedValue({
			user: { id: 'u1', email: 'tanya@example.test', name: 'Tanya' },
		});
		renderPage();

		const links = await screen.findAllByRole('link', { name: 'Кабінет' });
		expect(links).toHaveLength(2);
		for (const link of links) expect(link).toHaveAttribute('href', '/home');
		expect(screen.queryByRole('link', { name: 'Увійти' })).not.toBeInTheDocument();
	});
});
