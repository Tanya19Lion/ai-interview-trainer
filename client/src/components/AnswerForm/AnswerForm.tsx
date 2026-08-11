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
}

export function AnswerForm({ value, onChange, onSubmit, onSkip, pending }: AnswerFormProps) {
	return (
		<EditorWindow title={<>answer.md</>}>
			<Textarea
				placeholder="Введи свою відповідь…"
				value={value}
				disabled={pending}
				onChange={(event) => onChange(event.target.value)}
			/>
			<div className={styles.footer}>
				<span className={styles.charCount}>{value.length} символів</span>
				<div className={styles.actions}>
					<Button variant="ghost" type="button" disabled={pending} onClick={onSkip}>
						Не знаю
					</Button>
					<Button
						variant="primary"
						type="button"
						disabled={pending || value.trim().length === 0}
						onClick={onSubmit}
					>
						{pending ? <Spinner variant="on-primary" /> : 'Перевірити відповідь →'}
					</Button>
				</div>
			</div>
			{pending && <div className={styles.thinkingRow}>AI reviewer аналізує відповідь…</div>}
		</EditorWindow>
	);
}
