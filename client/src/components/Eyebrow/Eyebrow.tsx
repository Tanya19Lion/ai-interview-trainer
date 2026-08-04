import type { ReactNode } from 'react';
import styles from './Eyebrow.module.css';

export interface EyebrowProps {
	children: ReactNode;
	/** Центрувати мітку — використовується в CTA-блоках. */
	centered?: boolean;
}

/** Мала мітка-заголовок секції з крапкою-маркером, напр. "процес", "рев'ю". */
export function Eyebrow({ children, centered }: EyebrowProps) {
	return (
		<span className={[styles.eyebrow, centered ? styles.centered : null].filter(Boolean).join(' ')}>
			{children}
		</span>
	);
}
