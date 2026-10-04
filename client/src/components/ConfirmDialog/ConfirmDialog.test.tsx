import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog() {
	const onConfirm = vi.fn();
	const onCancel = vi.fn();
	const { container } = render(
		<ConfirmDialog
			title="Завершити сесію?"
			message="Прогрес не збережеться."
			confirmLabel="Завершити"
			cancelLabel="Продовжити"
			onConfirm={onConfirm}
			onCancel={onCancel}
		/>,
	);
	return { onConfirm, onCancel, overlay: container.firstElementChild as HTMLElement };
}

describe('ConfirmDialog', () => {
	afterEach(cleanup);

	it('shows the title, the message and both buttons', () => {
		renderDialog();

		expect(screen.getByRole('alertdialog', { name: 'Завершити сесію?' })).toBeInTheDocument();
		expect(screen.getByText('Прогрес не збережеться.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Завершити' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Продовжити' })).toBeInTheDocument();
	});

	it('calls onConfirm (and not onCancel) when the confirm button is clicked', async () => {
		const user = userEvent.setup();
		const { onConfirm, onCancel } = renderDialog();

		await user.click(screen.getByRole('button', { name: 'Завершити' }));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('calls onCancel when the cancel button is clicked', async () => {
		const user = userEvent.setup();
		const { onConfirm, onCancel } = renderDialog();

		await user.click(screen.getByRole('button', { name: 'Продовжити' }));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('calls onCancel on Escape', async () => {
		const user = userEvent.setup();
		const { onConfirm, onCancel } = renderDialog();

		await user.keyboard('{Escape}');

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('calls onCancel when the overlay is clicked, but not when the card itself is', async () => {
		const user = userEvent.setup();
		const { onCancel, overlay } = renderDialog();

		await user.click(screen.getByRole('alertdialog'));
		expect(onCancel).not.toHaveBeenCalled();

		await user.click(overlay);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('focuses the cancel button first, so Enter does not end the session by accident', () => {
		renderDialog();

		expect(screen.getByRole('button', { name: 'Продовжити' })).toHaveFocus();
	});
});
