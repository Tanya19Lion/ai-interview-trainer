import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Reads the real stylesheet (not a copy) so this test can never drift from the component's
// actual CSS. CSS-module class hashing only happens through the Vite build pipeline — the raw
// .module.css source on disk still has plain, literal class names (.grid, .cell, ...), so they
// can be reused as-is in a standalone fixture page.
const css = readFileSync(
	path.join(dirname, '../src/components/Heatmap/Heatmap.module.css'),
	'utf-8',
);

const CELLS = 53 * 7;

function fixtureHtml() {
	const cells = Array.from({ length: CELLS }, (_, i) => `<div class="cell" data-i="${i}"></div>`).join('');
	return `<!doctype html><html><head><style>${css}</style></head><body>
		<div class="grid" aria-hidden="true">${cells}</div>
	</body></html>`;
}

test('cells exactly one calendar week apart (7 days) land in the same row, one column over', async ({
	page,
}) => {
	await page.setContent(fixtureHtml());

	// Heatmap.tsx fills `cells` chronologically: index 0 is the oldest day, index 7 is exactly
	// one week later (same weekday). A correct calendar heatmap stacks each week's 7 days in one
	// column (row = weekday, column = week), so cell 7 must sit in the same row as cell 0, one
	// column to the right — not 7 columns over in the same row.
	const cell0 = await page.locator('.cell[data-i="0"]').evaluate((el) => el.getBoundingClientRect());
	const cell1 = await page.locator('.cell[data-i="1"]').evaluate((el) => el.getBoundingClientRect());
	const cell7 = await page.locator('.cell[data-i="7"]').evaluate((el) => el.getBoundingClientRect());

	const columnWidth = cell7.x - cell0.x;

	expect(cell7.y).toBeCloseTo(cell0.y, 0);
	// Consecutive days (0 and 1) must NOT share a column width step — they belong to the same
	// week, one row apart, not adjacent weeks.
	expect(Math.abs(cell1.x - cell0.x)).toBeLessThan(columnWidth / 2);
	expect(cell1.y).toBeGreaterThan(cell0.y);
});
