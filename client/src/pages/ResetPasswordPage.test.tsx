import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeContext } from '../context/theme/ThemeContext';
import i18n from '../i18n';

vi.mock('../hooks/useFakeSubmit', () => ({
	useFakeSubmit: () => ({ pending: false, run: (fn: () => void) => fn() }),
}));

const requestPasswordReset = vi.fn();
vi.mock('../api/auth', () => ({ requestPasswordReset }));

const { ResetPasswordPage } = await import('./ResetPasswordPage');
const { ApiError } = await import('../api/client');

function renderPage(search = '', setTheme = vi.fn()) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	render(
		<QueryClientProvider client={queryClient}>
			<ThemeContext.Provider value={{ theme: 'dark', setTheme }}>
				<MemoryRouter initialEntries={[`/reset-password${search}`]}>
					<ResetPasswordPage />
				</MemoryRouter>
			</ThemeContext.Provider>
		</QueryClientProvider>,
	);
	return { setTheme };
}

describe('ResetPasswordPage i18n', () => {
	afterEach(() => cleanup());

	it('renders the request form in Ukrainian by default', () => {
		renderPage();

		expect(screen.getByRole('heading', { level: 1, name: 'Забули пароль?' })).toBeInTheDocument();
		expect(screen.getByText('diff — порівняй. виправ. пройди.')).toBeInTheDocument();
	});

	it('offers the language toggle here too', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole('button', { name: 'Змінити мову на English' }));

		expect(screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeInTheDocument();
	});

	it('offers the theme toggle here too', async () => {
		const user = userEvent.setup();
		const { setTheme } = renderPage();

		await user.click(screen.getByRole('button', { name: 'Увімкнути світлу тему' }));

		expect(setTheme).toHaveBeenCalledWith('light');
	});

	it('walks the request flow in English and keeps the email in bold', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		requestPasswordReset.mockResolvedValue({ message: 'generic', attemptsRemaining: 2 });
		renderPage();

		expect(screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeInTheDocument();
		await user.type(screen.getByLabelText('Email'), 'a@b.co');
		await user.click(screen.getByRole('button', { name: 'Send link' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument();
		expect(requestPasswordReset).toHaveBeenCalledWith('a@b.co');
		expect(screen.getByText('a@b.co').tagName).toBe('B');
		expect(screen.getByRole('link', { name: '← Back to sign in' })).toBeInTheDocument();
	});

	it('shows the Google-account explanation and a sign-in link instead of the generic confirmation (AC-05)', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		requestPasswordReset.mockResolvedValue({ message: 'google', hint: 'google_account' });
		renderPage();

		await user.type(screen.getByLabelText('Email'), 'g@b.co');
		await user.click(screen.getByRole('button', { name: 'Send link' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Sign in with Google' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
	});

	it('shows a friendly message on a 429 and keeps the form so the user can retry later', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		requestPasswordReset.mockRejectedValue(new ApiError('Too many reset requests', 429));
		renderPage();

		await user.type(screen.getByLabelText('Email'), 'a@b.co');
		await user.click(screen.getByRole('button', { name: 'Send link' }));

		expect(await screen.findByText('Too many requests. Try again in an hour.')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeInTheDocument();
	});

	it('shows a generic error when the request fails for any other reason', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		requestPasswordReset.mockRejectedValue(new Error('network'));
		renderPage();

		await user.type(screen.getByLabelText('Email'), 'a@b.co');
		await user.click(screen.getByRole('button', { name: 'Send link' }));

		expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
	});

	it('walks the new-password flow in English, including the mismatch error', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		renderPage('?token=abc');

		expect(screen.getByRole('heading', { level: 1, name: 'New password' })).toBeInTheDocument();
		await user.type(screen.getByLabelText('New password'), 'password1');
		await user.type(screen.getByLabelText('Confirm password'), 'password2');
		await user.click(screen.getByRole('button', { name: 'Change password' }));
		expect(screen.getByText("Passwords don't match")).toBeInTheDocument();

		await user.clear(screen.getByLabelText('Confirm password'));
		await user.type(screen.getByLabelText('Confirm password'), 'password1');
		await user.click(screen.getByRole('button', { name: 'Change password' }));

		expect(screen.getByRole('heading', { level: 1, name: 'Password changed' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
	});
});
