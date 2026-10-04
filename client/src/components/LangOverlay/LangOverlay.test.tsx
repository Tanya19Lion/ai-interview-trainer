import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n, { LANG_STORAGE_KEY } from '../../i18n';
import { LangOverlay } from './LangOverlay';

describe('LangOverlay', () => {
	afterEach(() => cleanup());

	it('is shown until a language has been chosen', () => {
		render(<LangOverlay />);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('is not shown once a choice is stored', () => {
		localStorage.setItem(LANG_STORAGE_KEY, 'uk');
		render(<LangOverlay />);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('choosing English switches the UI and stores the choice', async () => {
		const user = userEvent.setup();
		render(<LangOverlay />);

		await user.click(screen.getByRole('button', { name: 'English' }));

		expect(i18n.language).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
	});
});
