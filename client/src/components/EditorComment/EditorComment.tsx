import type { ReactNode } from 'react';
import styles from './EditorComment.module.css';

export interface EditorCommentProps {
	who?: string;
	children: ReactNode;
}

/** Жовтий callout-коментар AI reviewer всередині EditorWindow. */
export function EditorComment({ who = 'AI reviewer', children }: EditorCommentProps) {
	return (
		<div className={styles.commentBlock}>
			<span className={styles.who}>{who}</span>
			{children}
		</div>
	);
}