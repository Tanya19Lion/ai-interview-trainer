import type { ReactNode } from 'react';
import styles from './EditorWindow.module.css';

export interface EditorWindowProps {
	/** Ім'я "файлу" в титулбарі, напр. <><b>session_04</b> · react/middle/answer.md</> */
	title?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
}

export function EditorWindow({ title, children, footer, className }: EditorWindowProps) {
	return (
		<div className={[styles.editorWindow, className].filter(Boolean).join(' ')}>
			<div className={styles.titlebar}>
				<span className={`${styles.dot} ${styles.dot1}`} />
				<span className={`${styles.dot} ${styles.dot2}`} />
				<span className={`${styles.dot} ${styles.dot3}`} />
				{title && <span className={styles.titlebarName}>{title}</span>}
			</div>
			<div className={styles.body}>{children}</div>
			{footer && <div className={styles.footer}>{footer}</div>}
		</div>
	);
}
