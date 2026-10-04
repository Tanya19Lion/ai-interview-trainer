import { useEffect } from 'react';
import { Button } from '../Button/Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	title,
	message,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') onCancel();
		}
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onCancel]);

	return (
		<div
			className={styles.overlay}
			onClick={(event) => {
				if (event.target === event.currentTarget) onCancel();
			}}
		>
			<div className={styles.card} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
				<h2 id="confirm-title" className={styles.title}>
					{title}
				</h2>
				<p className={styles.message}>{message}</p>
				<div className={styles.actions}>
					<Button variant="ghost" onClick={onCancel} autoFocus>
						{cancelLabel}
					</Button>
					<Button variant="primary" onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
