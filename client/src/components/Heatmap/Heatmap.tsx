import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLang, LOCALE } from '../../i18n';
import styles from './Heatmap.module.css';

const WEEKS = 53;
const CELLS = WEEKS * 7;

/** `YYYY-MM-DD` ± offset днів → північ цього UTC-дня. Лише календарна арифметика: до якого дня
 * належить сесія, вирішує сервер (`activityByDay`). */
function addUtcDays(isoDay: string, offset: number): Date {
	const [year, month, day] = isoDay.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + offset));
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
	/** Сесій на UTC-день (`YYYY-MM-DD`) з `GET /api/stats`. */
	activityByDay: Record<string, number>;
	/** Поточний UTC-день сервера (`YYYY-MM-DD`) — остання клітинка вікна. */
	today: string;
}

export function Heatmap({ activityByDay, today }: HeatmapProps) {
	// Підписка на зміну мови: сам Intl-форматтер береться з currentLang() усередині useMemo.
	const { t, i18n } = useTranslation();
	const total = useMemo(() => Object.values(activityByDay).reduce((sum, count) => sum + count, 0), [activityByDay]);
	const { cells, monthLabels } = useMemo(() => {
		const cells = Array.from({ length: CELLS }, (_, i) => {
			const date = addUtcDays(today, i - (CELLS - 1));
			const count = activityByDay[date.toISOString().slice(0, 10)] ?? 0;
			return { date, count, level: bucketize(count) };
		});

		const monthFormat = new Intl.DateTimeFormat(LOCALE[currentLang()], {
			month: 'short',
			timeZone: 'UTC',
		});
		const labelCount = 12;
		const monthLabels = Array.from({ length: labelCount }, (_, i) => {
			const cellIndex = Math.floor((i / (labelCount - 1)) * (cells.length - 1));
			return monthFormat.format(cells[cellIndex].date);
		});

		return { cells, monthLabels };
	}, [activityByDay, today, i18n.language]);

	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<span className={styles.count}>
					<b>{total}</b> {t('progress.count')}
				</span>
				<span className={styles.legend}>
					{t('progress.less')}
					<span className={styles.swatch} data-level={0} />
					<span className={styles.swatch} data-level={1} />
					<span className={styles.swatch} data-level={2} />
					<span className={styles.swatch} data-level={3} />
					<span className={styles.swatch} data-level={4} />
					{t('progress.more')}
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
						title={cell.count === 0 ? t('heat.none') : t('heat.sessions', { count: cell.count })}
					/>
				))}
			</div>
		</div>
	);
}
