import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import { FeedbackCard } from './FeedbackCard';

const BASE = {
	topic: 'react',
	level: 'junior',
	userAnswer: 'Мій варіант відповіді',
	correctAnswer: 'Еталонна відповідь',
	feedback: 'Непогано, але неповно.',
	score: 6,
} as const;

describe('FeedbackCard', () => {
	afterEach(cleanup);

	it('labels the user answer and the model answer, and shows the score and feedback', () => {
		render(<FeedbackCard {...BASE} skipped={false} />);

		expect(screen.getByText('Ось твоя відповідь')).toBeInTheDocument();
		expect(screen.getByText('Мій варіант відповіді')).toBeInTheDocument();
		expect(screen.getByText('Можлива відповідь')).toBeInTheDocument();
		expect(screen.getByText('Еталонна відповідь')).toBeInTheDocument();
		expect(screen.getByText('Непогано, але неповно.')).toBeInTheDocument();
		expect(screen.getByText(/Точність: 6\/10/)).toBeInTheDocument();
	});

	it('renders English labels', async () => {
		await i18n.changeLanguage('en');
		render(<FeedbackCard {...BASE} skipped={false} />);

		expect(screen.getByText('Here is your answer')).toBeInTheDocument();
		expect(screen.getByText('A possible answer')).toBeInTheDocument();
		expect(screen.getByText(/Accuracy: 6\/10/)).toBeInTheDocument();
	});

	it('for a skipped question shows only the model answer, with a note and no score', () => {
		render(<FeedbackCard {...BASE} userAnswer="" skipped score={0} feedback="" />);

		expect(screen.queryByText('Ось твоя відповідь')).not.toBeInTheDocument();
		expect(screen.getByText('Ось відповідь на питання')).toBeInTheDocument();
		expect(screen.getByText('Еталонна відповідь')).toBeInTheDocument();
		expect(screen.getByText(/не впливає на результат сесії/)).toBeInTheDocument();
		expect(screen.queryByText(/Точність/)).not.toBeInTheDocument();
	});
});
