import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './EditorComment.module.css';

export interface EditorCommentProps {
	who?: string;
	children: ReactNode;
}

export function EditorComment({ who, children }: EditorCommentProps) {
	const { t } = useTranslation();
	return (
		<div className={styles.commentBlock}>
			<span className={styles.who}>{who ?? t('editorComment.who')}</span>
			{children}
		</div>
	);
}