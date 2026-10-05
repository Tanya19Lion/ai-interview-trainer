import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { AnswerForm } from './AnswerForm';

function renderForm(length: number) {
	render(
		<AnswerForm value={'a'.repeat(length)} onChange={vi.fn()} onSubmit={vi.fn()} onSkip={vi.fn()} pending={false} />,
	);
}

describe('AnswerForm i18n', () => {
	afterEach(() => cleanup());

	it.each([
		[1, '1 символ'],
		[2, '2 символи'],
		[5, '5 символів'],
		[11, '11 символів'],
		[21, '21 символ'],
	])('uses the right Ukrainian plural for %i characters', (length, text) => {
		renderForm(length);

		expect(screen.getByText(text)).toBeInTheDocument();
	});

	it('renders English text and plural forms', async () => {
		await i18n.changeLanguage('en');
		renderForm(1);
		expect(screen.getByText('1 character')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: "I don't know" })).toBeInTheDocument();

		cleanup();
		renderForm(2);
		expect(screen.getByText('2 characters')).toBeInTheDocument();
	});
});
