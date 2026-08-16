import { useMemo } from 'react';
import styles from './Heatmap.module.css';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKS = 53;
const CELLS = WEEKS * 7;
const MONTH_LABELS_UK = [
	'січ',
	'лют',
	'бер',
	'кві',
	'тра',
	'чер',
	'лип',
	'сер',
	'вер',
	'жов',
	'лис',
	'гру',
];

function toUtcDayNumber(date: Date): number {
	return Math.floor(date.getTime() / MS_PER_DAY);
}

/** Кількість сесій за день → рівень інтенсивності 0-4 для кольору клітинки. */
function bucketize(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0) return 0;
	if (count === 1) return 1;
	if (count === 2) return 2;
	if (count <= 4) return 3;
	return 4;
}

export interface HeatmapProps {
	/** `completedAt` (ISO-рядки) завершених сесій, без фільтрів. */
	completedDates: string[];
}

export function Heatmap({ completedDates }: HeatmapProps) {
	const { cells, monthLabels } = useMemo(() => {
		const countByDay = new Map<number, number>();
		for (const iso of completedDates) {
			const day = toUtcDayNumber(new Date(iso));
			countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
		}

		const today = toUtcDayNumber(new Date());
		const start = today - (CELLS - 1);
		const cells = Array.from({ length: CELLS }, (_, i) => {
			const day = start + i;
			const count = countByDay.get(day) ?? 0;
			return { day, count, level: bucketize(count) };
		});

		const labelCount = 12;
		const monthLabels = Array.from({ length: labelCount }, (_, i) => {
			const cellIndex = Math.floor((i / (labelCount - 1)) * (cells.length - 1));
			const date = new Date(cells[cellIndex].day * MS_PER_DAY);
			return MONTH_LABELS_UK[date.getUTCMonth()];
		});

		return { cells, monthLabels };
	}, [completedDates]);

	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<span className={styles.count}>
					<b>{completedDates.length}</b> співбесід за останні 12 місяців
				</span>
				<span className={styles.legend}>
					менше
					<span className={styles.swatch} data-level={0} />
					<span className={styles.swatch} data-level={1} />
					<span className={styles.swatch} data-level={2} />
					<span className={styles.swatch} data-level={3} />
					<span className={styles.swatch} data-level={4} />
					більше
				</span>
			</div>
			<div className={styles.months}>
				{monthLabels.map((label, index) => (
					<span key={index}>{label}</span>
				))}
			</div>
			<div className={styles.grid} aria-hidden="true">
				{cells.map((cell, index) => (
					<div
						key={index}
						className={styles.cell}
						data-level={cell.level}
						title={cell.count === 0 ? 'Немає сесій' : `${cell.count} сесій`}
					/>
				))}
			</div>
		</div>
	);
}
