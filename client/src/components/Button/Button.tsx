import type { ButtonHTMLAttributes } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

export function Button({ variant, size, className, ...rest }: ButtonProps) {
	return <button className={buttonClassName({ variant, size, className })} {...rest} />;
}
