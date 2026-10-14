import { test, expect, type Browser, type Cookie, type Route } from '@playwright/test';

const LANG_CHOSEN_KEY = 'diff-lang-chosen';
const MOCK_USER = { id: 'u1', email: 'tanya@example.test', name: 'Tanya' };

// Marks the mock "session cookie" Playwright sets after a successful login. A real browser
// drops a session cookie (no Max-Age/Expires) on restart but keeps a persistent one — Playwright
// contexts don't model that automatically, so the test simulates it itself (see
// simulateBrowserRestart) by inspecting each cookie's `expires` field (-1 means session-only).
const SESSION_COOKIE_NAME = 'diff_session';

async function fulfillLogin(route: Route, rememberMe: boolean) {
	const cookie = rememberMe
		? `${SESSION_COOKIE_NAME}=mock-token; Path=/; HttpOnly; Max-Age=2592000`
		: `${SESSION_COOKIE_NAME}=mock-token; Path=/; HttpOnly`;
	await route.fulfill({
		status: 200,
		contentType: 'application/json',
		headers: { 'set-cookie': cookie },
		body: JSON.stringify({ user: MOCK_USER }),
	});
}

async function fulfillMe(route: Route) {
	const cookieHeader = route.request().headers()['cookie'] ?? '';
	if (cookieHeader.includes(SESSION_COOKIE_NAME)) {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ user: MOCK_USER }),
		});
	} else {
		await route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({ message: 'not authenticated' }),
		});
	}
}

test.describe('remember-me persistence across browser restart (AC-01, AC-02)', () => {
	test('checked: stays authenticated after restart and sends rememberMe=true', async ({ browser }) => {
		const context = await browser.newContext();
		await context.addInitScript(
			([key, value]) => localStorage.setItem(key, value),
			[LANG_CHOSEN_KEY, 'uk'],
		);

		let postedBody: unknown;
		await context.route('**/api/auth/login', async (route) => {
			postedBody = route.request().postDataJSON();
			await fulfillLogin(route, true);
		});
		await context.route('**/api/auth/me', fulfillMe);
		await context.route('**/api/auth/refresh', (route) => route.fulfill({ status: 204 }));

		const page = await context.newPage();
		await page.goto('/login');

		await page.getByRole('checkbox', { name: /запам.ят/i }).check();
		await page.getByLabel('Email').fill('tanya@example.test');
		await page.getByLabel('Пароль', { exact: true }).fill('password123');
		await page.getByRole('button', { name: 'Увійти' }).click();

		await expect(page).toHaveURL(/\/home$/);
		expect((postedBody as { rememberMe?: boolean }).rememberMe).toBe(true);

		const cookies = await context.cookies();
		await context.close();

		const restartedContext = await simulateBrowserRestart(browser, cookies);
		await restartedContext.addInitScript(
			([key, value]) => localStorage.setItem(key, value),
			[LANG_CHOSEN_KEY, 'uk'],
		);
		await restartedContext.route('**/api/auth/me', fulfillMe);
		await restartedContext.route('**/api/auth/refresh', (route) => route.fulfill({ status: 204 }));

		const restartedPage = await restartedContext.newPage();
		await restartedPage.goto('/home');

		await expect(restartedPage).toHaveURL(/\/home$/);
		await restartedContext.close();
	});

	test('unchecked: must log in again after restart and sends rememberMe=false', async ({ browser }) => {
		const context = await browser.newContext();
		await context.addInitScript(
			([key, value]) => localStorage.setItem(key, value),
			[LANG_CHOSEN_KEY, 'uk'],
		);

		let postedBody: unknown;
		await context.route('**/api/auth/login', async (route) => {
			postedBody = route.request().postDataJSON();
			await fulfillLogin(route, false);
		});
		await context.route('**/api/auth/me', fulfillMe);
		await context.route('**/api/auth/refresh', (route) => route.fulfill({ status: 204 }));

		const page = await context.newPage();
		await page.goto('/login');

		await expect(page.getByRole('checkbox', { name: /запам.ят/i })).not.toBeChecked();
		await page.getByLabel('Email').fill('tanya@example.test');
		await page.getByLabel('Пароль', { exact: true }).fill('password123');
		await page.getByRole('button', { name: 'Увійти' }).click();

		await expect(page).toHaveURL(/\/home$/);
		expect((postedBody as { rememberMe?: boolean }).rememberMe).toBe(false);

		const cookies = await context.cookies();
		await context.close();

		const restartedContext = await simulateBrowserRestart(browser, cookies);
		await restartedContext.addInitScript(
			([key, value]) => localStorage.setItem(key, value),
			[LANG_CHOSEN_KEY, 'uk'],
		);
		await restartedContext.route('**/api/auth/me', fulfillMe);
		await restartedContext.route('**/api/auth/refresh', (route) => route.fulfill({ status: 204 }));

		const restartedPage = await restartedContext.newPage();
		await restartedPage.goto('/home');

		await expect(restartedPage).toHaveURL(/\/login$/);
		await restartedContext.close();
	});
});

// A real browser persists only cookies with Max-Age/Expires across a restart and drops
// session-only ones (expires === -1 in Playwright's cookie shape); a Playwright context itself
// has no disk-backed persistence, so this replicates that distinction by hand when seeding the
// new context's storage state.
async function simulateBrowserRestart(browser: Browser, cookies: Cookie[]) {
	const persisted = cookies.filter((cookie) => cookie.expires !== -1);
	return browser.newContext({ storageState: { cookies: persisted, origins: [] } });
}
