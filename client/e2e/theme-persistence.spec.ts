import { test, expect } from '@playwright/test';

const THEME_KEY = 'diff-theme';
const LANG_CHOSEN_KEY = 'diff-lang-chosen';

test('persists a manually chosen theme across reload (PRD §6 QG-3)', async ({ page }) => {
	// Skip the one-time language overlay so it doesn't block the theme toggle click.
	await page.addInitScript(
		([key, value]) => localStorage.setItem(key, value),
		[LANG_CHOSEN_KEY, 'uk'],
	);

	await page.goto('/');

	const toggle = page.getByRole('button', { name: /тему/i });
	const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
	const expectedTheme = initialTheme === 'dark' ? 'light' : 'dark';

	await toggle.click();

	await expect(page.locator('html')).toHaveAttribute('data-theme', expectedTheme);
	await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe(
		expectedTheme,
	);

	await page.reload();

	// Re-assert after reload: the app must re-render in the chosen theme by reading it back from
	// localStorage (PRD's own stated measurement method), not just retain in-memory state.
	await expect(page.locator('html')).toHaveAttribute('data-theme', expectedTheme);
	await expect(page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).resolves.toBe(
		expectedTheme,
	);
});
