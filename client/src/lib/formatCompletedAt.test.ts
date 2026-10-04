import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { formatCompletedAt } from './formatCompletedAt';

// Local noon: the calendar day is the same in every timezone the CI could use.
const ISO = new Date(2026, 9, 4, 12, 0, 0).toISOString();

describe('formatCompletedAt', () => {
	it('returns an em dash for an unfinished session', () => {
		expect(formatCompletedAt(undefined)).toBe('—');
	});

	it('formats the date the Ukrainian way', () => {
		expect(formatCompletedAt(ISO, 'uk')).toBe('04.10.2026');
	});

	it('formats the date the English way', () => {
		expect(formatCompletedAt(ISO, 'en')).toBe('10/4/2026');
	});

	it('follows the current UI language by default', async () => {
		await i18n.changeLanguage('en');

		expect(formatCompletedAt(ISO)).toBe('10/4/2026');
	});
});
