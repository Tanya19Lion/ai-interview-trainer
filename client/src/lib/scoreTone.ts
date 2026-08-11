import type { ScoreTone } from '../components';

/** score — оцінка відповіді від 0 до 10. */
export function scoreTone(score: number): ScoreTone {
	if (score >= 8) return 'good';
	if (score >= 5) return 'mid';
	return 'low';
}
