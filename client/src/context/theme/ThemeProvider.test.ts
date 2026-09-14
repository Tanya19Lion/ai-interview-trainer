import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveInitialTheme } from './ThemeProvider';

const STORAGE_KEY = 'diff-theme';

function mockMatchMedia(prefersDark: boolean) {
	const matchMedia = vi.fn().mockReturnValue({ matches: prefersDark });
	vi.stubGlobal('matchMedia', matchMedia);
	return matchMedia;
}

describe('resolveInitialTheme', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses a valid stored value and skips reading the OS preference', () => {
		localStorage.setItem(STORAGE_KEY, 'light');
		const matchMedia = mockMatchMedia(true);

		expect(resolveInitialTheme()).toBe('light');
		expect(matchMedia).not.toHaveBeenCalled();
	});

	it('falls back to prefers-color-scheme when the stored value is missing/corrupted, without throwing', () => {
		localStorage.setItem(STORAGE_KEY, 'not-a-theme');
		mockMatchMedia(true);

		expect(() => resolveInitialTheme()).not.toThrow();
		expect(resolveInitialTheme()).toBe('dark');
	});

	it('reads the OS preference once on first visit and does not persist it', () => {
		const matchMedia = mockMatchMedia(false);

		expect(resolveInitialTheme()).toBe('light');
		expect(matchMedia).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('keeps the stored choice even when it disagrees with the current OS preference', () => {
		localStorage.setItem(STORAGE_KEY, 'dark');
		const matchMedia = mockMatchMedia(false);

		expect(resolveInitialTheme()).toBe('dark');
		expect(matchMedia).not.toHaveBeenCalled();
	});
});
