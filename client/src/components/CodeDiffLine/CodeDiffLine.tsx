import type { ReactNode } from 'react';
import styles from './CodeDiffLine.module.css';

export type CodeDiffLineVariant = 'neutral' | 'question' | 'removed' | 'added';

export interface CodeDiffLineProps {
	/** Номер рядка в лівій "gutter"-колонці, напр. 12 */
	gutter: ReactNode;
	variant?: CodeDiffLineVariant;
	children: ReactNode;
}

const VARIANT_CLASS: Record<CodeDiffLineVariant, string | undefined> = {
	neutral: undefined,
	question: styles.question,
	removed: styles.removed,
	added: styles.added,
};

export function CodeDiffLine({ gutter, variant = 'neutral', children }: CodeDiffLineProps) {
	return (
		<div className={[styles.line, VARIANT_CLASS[variant]].filter(Boolean).join(' ')}>
			<span className={styles.gutter}>{gutter}</span>
			<span className={styles.content}>{children}</span>
		</div>
	);
}
