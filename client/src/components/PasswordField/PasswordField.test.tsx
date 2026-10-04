import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
	afterEach(() => cleanup());

	it.each([
		['uk', 'Показати пароль'],
		['en', 'Show password'],
	])('labels the reveal button in %s', async (lang, label) => {
		await i18n.changeLanguage(lang);
		render(<PasswordField label="Password" value="" onChange={vi.fn()} />);

		expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
	});

	it.each([
		['uk', 'Приховати пароль'],
		['en', 'Hide password'],
	])('labels the hide button in %s once the password is revealed', async (lang, label) => {
		const user = userEvent.setup();
		await i18n.changeLanguage(lang);
		render(<PasswordField label="Password" value="" onChange={vi.fn()} />);

		await user.click(screen.getByRole('button'));

		expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
	});
});
