import { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { buttonClassName } from '../Button/buttonClassName';
import { useTheme } from '../../context/theme/useTheme';
import styles from './ThemeToggle.module.css';

const TOGGLE_DEBOUNCE_MS = 300;

/** Перемикач теми (світла/темна), дебаунсить швидкі повторні кліки (PRD §6.1). */
export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const lastToggleRef = useRef(0);

	function handleClick() {
		const now = Date.now();
		if (now - lastToggleRef.current < TOGGLE_DEBOUNCE_MS) {
			return;
		}
		lastToggleRef.current = now;
		setTheme(theme === 'dark' ? 'light' : 'dark');
	}

	return (
		<button
			type="button"
			className={buttonClassName({ variant: 'ghost', size: 'md', className: styles.toggle })}
			onClick={handleClick}
			aria-label={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
		>
			{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
		</button>
	);
}
