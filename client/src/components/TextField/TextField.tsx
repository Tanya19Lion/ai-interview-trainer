import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
	label: string;
}

/** Підписане текстове поле (email, ім'я тощо) у стилі PasswordField. */
export function TextField({ label, id, ...rest }: TextFieldProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;

	return (
		<div className={styles.field}>
			<label htmlFor={fieldId} className={styles.label}>
				{label}
			</label>
			<input id={fieldId} className={styles.input} {...rest} />
		</div>
	);
}