import { useLayoutEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';
import { resolveInitialTheme, STORAGE_KEY } from './resolveInitialTheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

	useLayoutEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	}, [theme]);

	function setTheme(next: Theme) {
		localStorage.setItem(STORAGE_KEY, next);
		setThemeState(next);
	}

	return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
