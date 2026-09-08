import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './PasswordField.module.css';

export interface PasswordFieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete?: string;
	minLength?: number;
	hint?: string;
	required?: boolean;
	placeholder?: string;
	/** Елемент праворуч від лейбла в одному рядку, напр. посилання "Забули пароль?". */
	labelExtra?: ReactNode;
}

/** Поле пароля з кнопкою показати/приховати, напр. на формах логіну/реєстрації. */
export function PasswordField({
	label,
	value,
	onChange,
	autoComplete,
	minLength,
	hint,
	required,
	placeholder,
	labelExtra,
}: PasswordFieldProps) {
	const [visible, setVisible] = useState(false);
	const id = useId();

	return (
		<div className={styles.field}>
			{labelExtra ? (
				<div className={styles.labelRow}>
					<label htmlFor={id} className={styles.label}>
						{label}
					</label>
					{labelExtra}
				</div>
			) : (
				<label htmlFor={id} className={styles.label}>
					{label}
				</label>
			)}
			<div className={styles.wrap}>
				<input
					id={id}
					type={visible ? 'text' : 'password'}
					className={styles.input}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					autoComplete={autoComplete}
					minLength={minLength}
					required={required}
					placeholder={placeholder}
				/>
				<button
					type="button"
					className={styles.toggle}
					onClick={() => setVisible((v) => !v)}
					aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}
				>
					{visible ? <EyeOff size={16} /> : <Eye size={16} />}
				</button>
			</div>
			{hint && <p className={styles.hint}>{hint}</p>}
		</div>
	);
}