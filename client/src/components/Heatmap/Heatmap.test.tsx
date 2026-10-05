import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n';
import { Heatmap } from './Heatmap';

afterEach(cleanup);

function cells(container: HTMLElement) {
	return Array.from(container.querySelectorAll<HTMLElement>('[data-level]')).filter((el) => el.getAttribute('title') !== null);
}

describe('Heatmap', () => {
	it('fills the last cell from the server-supplied "today" and the one before it from the previous day', () => {
		const { container } = render(<Heatmap today="2026-10-05" activityByDay={{ '2026-10-05': 5, '2026-10-04': 2 }} />);

		const all = cells(container);
		expect(all).toHaveLength(53 * 7);
		expect(all[all.length - 1].dataset.level).toBe('4');
		expect(all[all.length - 2].dataset.level).toBe('2');
		expect(all[all.length - 3].dataset.level).toBe('0');
	});

	it('shows the total number of sessions across all days, including ones outside the window', () => {
		const { container } = render(<Heatmap today="2026-10-05" activityByDay={{ '2026-10-05': 1, '2020-01-01': 3 }} />);

		expect(container.querySelector('b')?.textContent).toBe('4');
	});

	it('renders an empty grid when there is no activity', () => {
		const { container } = render(<Heatmap today="2026-10-05" activityByDay={{}} />);

		expect(cells(container).every((el) => el.dataset.level === '0')).toBe(true);
	});
});
