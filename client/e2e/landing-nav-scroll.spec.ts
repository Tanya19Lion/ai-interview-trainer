import { test, expect } from '@playwright/test';

const LANG_CHOSEN_KEY = 'diff-lang-chosen';

test.beforeEach(async ({ page }) => {
	// Skip the one-time language overlay so it doesn't block nav clicks.
	await page.addInitScript(
		([key, value]) => localStorage.setItem(key, value),
		[LANG_CHOSEN_KEY, 'uk'],
	);
	await page.goto('/');
});

test('"Можливості" and "Як це працює" scroll to different sections', async ({ page }) => {
	const nav = page.getByRole('navigation');

	await nav.getByRole('link', { name: 'Як це працює' }).click();
	await page.waitForTimeout(800);
	const howScrollY = await page.evaluate(() => window.scrollY);

	await nav.getByRole('link', { name: 'Можливості' }).click();
	await page.waitForTimeout(800);
	const featuresScrollY = await page.evaluate(() => window.scrollY);

	expect(featuresScrollY).not.toBe(howScrollY);
});

test('clicking a landing nav link scrolls the target to the configured scroll-margin-top', async ({
	page,
}) => {
	await page.getByRole('navigation').getByRole('link', { name: 'Як це працює' }).click();
	await page.waitForTimeout(800);

	const targetTop = await page.locator('#how').evaluate((el) => el.getBoundingClientRect().top);

	// .section's scroll-margin-top (50px) is a deliberate design choice — it leaves the target
	// tucked slightly under the translucent sticky nav rather than fully clearing it.
	expect(targetTop).toBeCloseTo(50, -1);
});
