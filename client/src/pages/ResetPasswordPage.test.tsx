import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';

vi.mock('../hooks/useFakeSubmit', () => ({
	useFakeSubmit: () => ({ pending: false, run: (fn: () => void) => fn() }),
}));

const { ResetPasswordPage } = await import('./ResetPasswordPage');

function renderPage(search = '') {
	render(
		<MemoryRouter initialEntries={[`/reset-password${search}`]}>
			<ResetPasswordPage />
		</MemoryRouter>,
	);
}

describe('ResetPasswordPage i18n', () => {
	afterEach(() => cleanup());

	it('renders the request form in Ukrainian by default', () => {
		renderPage();

		expect(screen.getByRole('heading', { level: 1, name: 'Забули пароль?' })).toBeInTheDocument();
		expect(screen.getByText('diff — порівняй. виправ. пройди.')).toBeInTheDocument();
	});

	it('walks the request flow in English and keeps the email in bold', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		renderPage();

		expect(screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeInTheDocument();
		await user.type(screen.getByLabelText('Email'), 'a@b.co');
		await user.click(screen.getByRole('button', { name: 'Send link' }));

		expect(screen.getByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument();
		expect(screen.getByText('a@b.co').tagName).toBe('B');
		expect(screen.getByRole('link', { name: '← Back to sign in' })).toBeInTheDocument();
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
