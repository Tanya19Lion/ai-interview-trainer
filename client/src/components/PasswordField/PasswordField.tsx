import { useId, useState } from 'react';
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
}: PasswordFieldProps) {
	const [visible, setVisible] = useState(false);
	const id = useId();

	return (
		<div className={styles.field}>
			<label htmlFor={id} className={styles.label}>
				{label}
			</label>
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