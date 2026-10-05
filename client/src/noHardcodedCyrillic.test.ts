import { describe, expect, it } from 'vitest';

// Best-effort guard: source files (not tests, not the dev showcase App.tsx) must not contain
// Cyrillic outside comments — user-facing text belongs in locales/*.json.
const files = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}', '!./App.tsx'], {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

const CYRILLIC = /[Ѐ-ӿ]/;

function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ''))
		.replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('no hardcoded Cyrillic in client source', () => {
	it('keeps user-facing text in the locale files', () => {
		const offenders = Object.entries(files).flatMap(([path, source]) =>
			stripComments(source)
				.split('\n')
				.map((text, index) => ({ path, line: index + 1, text }))
				.filter(({ text }) => CYRILLIC.test(text))
				.map(({ path, line, text }) => `${path}:${line}: ${text.trim()}`),
		);

		expect(offenders).toEqual([]);
	});
});
