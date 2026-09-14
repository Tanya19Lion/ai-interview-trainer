import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ThemeContext, type Theme } from '../../context/theme/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

function renderToggle(theme: Theme, setTheme = vi.fn()) {
	render(
		<ThemeContext.Provider value={{ theme, setTheme }}>
			<ThemeToggle />
		</ThemeContext.Provider>,
	);
	return { setTheme };
}

describe('ThemeToggle', () => {
	afterEach(async () => {
		cleanup();
		await i18n.changeLanguage('uk');
	});

	it('calls setTheme with the alternate value on click', async () => {
		const user = userEvent.setup();
		const { setTheme } = renderToggle('dark');

		await user.click(screen.getByRole('button'));

		expect(setTheme).toHaveBeenCalledWith('light');
	});

	it('shows the Sun icon (and offers to enable light) while the active theme is dark', () => {
		renderToggle('dark');

		expect(document.querySelector('svg.lucide-sun')).toBeInTheDocument();
		expect(document.querySelector('svg.lucide-moon')).not.toBeInTheDocument();
	});

	it('shows the Moon icon (and offers to enable dark) while the active theme is light', () => {
		renderToggle('light');

		expect(document.querySelector('svg.lucide-moon')).toBeInTheDocument();
		expect(document.querySelector('svg.lucide-sun')).not.toBeInTheDocument();
	});

	it("matches the uk locale's aria-label", async () => {
		await i18n.changeLanguage('uk');
		renderToggle('dark');

		expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Увімкнути світлу тему');
	});

	it("matches the en locale's aria-label", async () => {
		await i18n.changeLanguage('en');
		renderToggle('light');

		expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark theme');
	});
});
