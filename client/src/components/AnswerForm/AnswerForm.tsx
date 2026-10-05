import { useTranslation } from 'react-i18next';
import { Button } from '../Button/Button';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { Spinner } from '../Spinner/Spinner';
import { Textarea } from '../Textarea/Textarea';
import styles from './AnswerForm.module.css';

export interface AnswerFormProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onSkip: () => void;
	pending: boolean;
	/** Запит у польоті — це "Не знаю" (відповідь не перевіряється, лише генерується). */
	skipping?: boolean;
}

export function AnswerForm({ value, onChange, onSubmit, onSkip, pending, skipping = false }: AnswerFormProps) {
	const { t } = useTranslation();
	return (
		<EditorWindow title={<>answer.md</>}>
			<Textarea
				placeholder={t('answer.placeholder')}
				value={value}
				disabled={pending}
				onChange={(event) => onChange(event.target.value)}
			/>
			<div className={styles.footer}>
				<span className={styles.charCount}>{t('answer.chars', { count: value.length })}</span>
				<div className={styles.actions}>
					<Button variant="ghost" type="button" disabled={pending} onClick={onSkip}>
						{t('answer.skip')}
					</Button>
					<Button
						variant="primary"
						type="button"
						disabled={pending || value.trim().length === 0}
						onClick={onSubmit}
					>
						{pending && !skipping ? <Spinner variant="on-primary" /> : t('answer.submit')}
					</Button>
				</div>
			</div>
			{pending && (
				<div className={styles.thinkingRow}>
					{skipping ? t('answer.skipping') : t('answer.reviewing')}
				</div>
			)}
		</EditorWindow>
	);
}
