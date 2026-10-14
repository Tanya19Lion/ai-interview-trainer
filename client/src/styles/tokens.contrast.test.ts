import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(dirname, 'tokens.css'), 'utf-8');

/** Reads `--token: #rrggbb;` from a given block of the real tokens.css (`:root` or
 * `[data-theme='light']`) — never hardcode the values here, or this test stops catching drift. */
function readVar(block: string, name: string): string {
	const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
	if (!match) throw new Error(`--${name} not found as a plain hex value in this block`);
	return match[1];
}

// Search for the actual rule (with its opening brace), not a bare string match — tokens.css has
// a comment mentioning "[data-theme='light']" by name before the real rule starts.
const lightRuleStart = css.indexOf("[data-theme='light'] {");
const rootBlock = css.slice(css.indexOf(':root'), lightRuleStart);
const lightBlock = css.slice(lightRuleStart);

function hexToRgb(hex: string): [number, number, number] {
	const n = hex.replace('#', '');
	return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
	const f = (c: number) => {
		c /= 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.x contrast ratio between two sRGB hex colors. */
function contrast(hexA: string, hexB: string): number {
	const [lighter, darker] = [relativeLuminance(hexToRgb(hexA)), relativeLuminance(hexToRgb(hexB))].sort(
		(a, b) => b - a,
	);
	return (lighter + 0.05) / (darker + 0.05);
}

describe('light-theme text contrast (WCAG AA, 4.5:1 for normal text)', () => {
	// Light theme falls back to the dark-theme :root values for any token it doesn't override
	// (e.g. --canvas-3), so each text token is checked against every canvas surface it can
	// legally render on.
	const surfaces = [
		{ name: 'canvas', hex: readVar(lightBlock, 'canvas') },
		{ name: 'canvas-2', hex: readVar(lightBlock, 'canvas-2') },
		{ name: 'canvas-3', hex: readVar(lightBlock, 'canvas-3') },
		// --paper is never overridden for light theme (editor-window stays constant, see tokens.css).
		{ name: 'paper', hex: readVar(rootBlock, 'paper') },
	];

	const textTokens = ['text-soft', 'text-faint', 'green-text', 'rust-text', 'amber-text'];

	for (const token of textTokens) {
		const hex = readVar(lightBlock, token);
		for (const surface of surfaces) {
			it(`--${token} (${hex}) on --${surface.name} (${surface.hex}) clears 4.5:1`, () => {
				expect(contrast(hex, surface.hex)).toBeGreaterThanOrEqual(4.5);
			});
		}
	}
});
