import styles from './Spinner.module.css';

export interface SpinnerProps {
	/** 'on-primary' — темніший варіант для використання всередині Button variant="primary". */
	variant?: 'default' | 'on-primary';
	'aria-label'?: string;
}

export function Spinner({
	variant = 'default',
	'aria-label': ariaLabel = 'Завантаження…',
}: SpinnerProps) {
	return (
		<span
			className={[styles.spinner, variant === 'on-primary' ? styles.onPrimary : null]
				.filter(Boolean)
				.join(' ')}
			role="status"
			aria-label={ariaLabel}
		/>
	);
}
