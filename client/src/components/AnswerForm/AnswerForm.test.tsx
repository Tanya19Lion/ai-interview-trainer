import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnswerForm } from './AnswerForm';

function renderForm(props: Partial<Parameters<typeof AnswerForm>[0]> = {}) {
	const onSkip = vi.fn();
	const onSubmit = vi.fn();
	render(
		<AnswerForm value="відповідь" onChange={vi.fn()} onSubmit={onSubmit} onSkip={onSkip} pending={false} {...props} />,
	);
	return { onSkip, onSubmit };
}

describe('AnswerForm', () => {
	afterEach(cleanup);

	it('calls onSkip when "Не знаю" is clicked', async () => {
		const user = userEvent.setup();
		const { onSkip, onSubmit } = renderForm();

		await user.click(screen.getByRole('button', { name: 'Не знаю' }));

		expect(onSkip).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('shows no loading row while nothing is pending', () => {
		renderForm();

		expect(screen.queryByText(/AI reviewer/)).not.toBeInTheDocument();
	});

	it('says the answer is being analysed while a normal answer is pending', () => {
		renderForm({ pending: true });

		expect(screen.getByText('AI reviewer аналізує відповідь…')).toBeInTheDocument();
	});

	it('says the model is preparing an answer (not analysing) while a skip is pending', () => {
		renderForm({ pending: true, skipping: true });

		expect(screen.getByText('AI reviewer готує відповідь на питання…')).toBeInTheDocument();
		expect(screen.queryByText('AI reviewer аналізує відповідь…')).not.toBeInTheDocument();
		// the check button keeps its label instead of showing a spinner for a skip
		expect(screen.getByRole('button', { name: 'Перевірити відповідь →' })).toBeInTheDocument();
	});

	it('disables "Не знаю" while a request is pending', () => {
		renderForm({ pending: true });

		expect(screen.getByRole('button', { name: 'Не знаю' })).toBeDisabled();
	});
});
