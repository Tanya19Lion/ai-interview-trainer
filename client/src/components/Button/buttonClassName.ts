import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonClassNameOptions {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
}

/** Будує ті самі CSS-класи, що й <Button>, для елементів, які не можуть бути <button> (наприклад react-router <Link>). */
export function buttonClassName({
	variant = 'primary',
	size = 'md',
	className,
}: ButtonClassNameOptions): string {
	return [styles.btn, styles[variant], size !== 'md' ? styles[size] : null, className]
		.filter(Boolean)
		.join(' ');
}
