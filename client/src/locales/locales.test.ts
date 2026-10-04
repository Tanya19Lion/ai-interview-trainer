import { describe, expect, it } from 'vitest';
import en from './en.json';
import uk from './uk.json';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function baseKey(key: string): string {
	return key.replace(PLURAL_SUFFIX, '');
}

function placeholders(value: string): string[] {
	return [...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
}

function groupByBase(dict: Record<string, string>): Map<string, Set<string>> {
	const groups = new Map<string, Set<string>>();
	for (const [key, value] of Object.entries(dict)) {
		const set = groups.get(baseKey(key)) ?? new Set<string>();
		placeholders(value).forEach((p) => set.add(p));
		groups.set(baseKey(key), set);
	}
	return groups;
}

describe('locales', () => {
	const ukGroups = groupByBase(uk);
	const enGroups = groupByBase(en);

	it('uk.json and en.json define the same keys (plural forms collapsed)', () => {
		expect([...ukGroups.keys()].sort()).toEqual([...enGroups.keys()].sort());
	});

	it('both languages use the same interpolation variables for every key', () => {
		for (const [key, vars] of ukGroups) {
			expect({ key, vars: [...vars].sort() }).toEqual({ key, vars: [...(enGroups.get(key) ?? [])].sort() });
		}
	});

	it('words the model answer as a possibility, not a verdict', () => {
		expect(uk['card.betterAnswer']).toBe('Можлива відповідь');
		expect(en['card.betterAnswer']).toBe('A possible answer');
	});
});
