import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n, { LANG_STORAGE_KEY } from '../../i18n';
import { LangToggle } from './LangToggle';

describe('LangToggle', () => {
	afterEach(() => cleanup());

	it('offers the other language: shows EN while the UI is Ukrainian', () => {
		render(<LangToggle />);

		const button = screen.getByRole('button', { name: 'Змінити мову на English' });
		expect(button).toHaveTextContent('EN');
	});

	it('switches to English on click and persists the choice', async () => {
		const user = userEvent.setup();
		render(<LangToggle />);

		await user.click(screen.getByRole('button'));

		expect(i18n.language).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
		expect(screen.getByRole('button', { name: 'Switch language to Українська' })).toHaveTextContent('UK');
	});
});
