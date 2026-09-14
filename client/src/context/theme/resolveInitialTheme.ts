import type { Theme } from './ThemeContext';

export const STORAGE_KEY = 'diff-theme';

function isTheme(value: string | null): value is Theme {
	return value === 'light' || value === 'dark';
}

export function resolveInitialTheme(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (isTheme(stored)) {
		return stored;
	}
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
