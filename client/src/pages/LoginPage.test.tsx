import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';

const { idle } = vi.hoisted(() => ({ idle: { mutate: vi.fn(), isPending: false, error: null } }));

vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => null }));
vi.mock('../hooks/useAuth', () => ({
	useGoogleLogin: () => idle,
	useLoginWithPassword: () => idle,
	useRegister: () => idle,
}));

const { LoginPage } = await import('./LoginPage');

function renderPage() {
	render(
		<MemoryRouter>
			<LoginPage />
		</MemoryRouter>,
	);
}

describe('LoginPage i18n', () => {
	afterEach(() => cleanup());

	it('renders Ukrainian by default', () => {
		renderPage();

		expect(screen.getByRole('heading', { level: 1, name: 'Один акаунт. Уся історія твоїх співбесід.' })).toBeInTheDocument();
		expect(screen.getByText('Забули пароль?')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Умовами використання' })).toBeInTheDocument();
		expect(screen.getByText('diff — порівняй. виправ. пройди.')).toBeInTheDocument();
	});

	it('renders the sign-in form in English', async () => {
		await i18n.changeLanguage('en');
		renderPage();

		expect(screen.getByRole('heading', { level: 1, name: 'One account. Your whole interview history.' })).toBeInTheDocument();
		expect(screen.getByText('Forgot password?')).toBeInTheDocument();
		expect(screen.getByText('or')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Terms of Use' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument();
		expect(screen.getByText('diff — compare. fix. pass.')).toBeInTheDocument();
	});

	it('renders the sign-up form in English after switching the tab', async () => {
		const user = userEvent.setup();
		await i18n.changeLanguage('en');
		renderPage();

		await user.click(screen.getAllByText('Sign up')[0]);

		expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
		expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
		expect(screen.getByText('Already have an account?')).toBeInTheDocument();
	});
});
