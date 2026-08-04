import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'good' | 'amber';

export interface BadgeProps {
	/** Приглушений префікс-мітка, напр. "точність". Якщо не задано — badge рендериться як простий текст. */
	label?: ReactNode;
	tone?: BadgeTone;
	children: ReactNode;
}

/** Пігулка зі статистикою на темному тлі: <k>точність</k> <v>78%</v>. */
export function Badge({ label, tone = 'neutral', children }: BadgeProps) {
	const toneClass = tone === 'good' ? styles.good : tone === 'amber' ? styles.amber : undefined;
	return (
		<span className={[styles.badge, toneClass].filter(Boolean).join(' ')}>
			{label ? (
				<>
					<span className={styles.key}>{label}</span>
					<span className={styles.value}>{children}</span>
				</>
			) : (
				children
			)}
		</span>
	);
}

export interface ChipProps {
	children: ReactNode;
}

/** Простий одиночний тег на темному тлі, напр. "#react". */
export function Chip({ children }: ChipProps) {
	return <span className={styles.chip}>{children}</span>;
}

export type ScoreTone = 'good' | 'mid' | 'low';

export interface ScoreChipProps {
	tone?: ScoreTone;
	children: ReactNode;
}

const SCORE_TONE_CLASS: Record<ScoreTone, string> = {
	good: styles.scoreGood,
	mid: styles.scoreMid,
	low: styles.scoreLow,
};

/** Пігулка з оцінкою всередині EditorWindow (світле тло), напр. "Точність: 6/10". */
export function ScoreChip({ tone = 'mid', children }: ScoreChipProps) {
	return <span className={[styles.scoreChip, SCORE_TONE_CLASS[tone]].join(' ')}>{children}</span>;
}

export interface LevelChipProps {
	children: ReactNode;
}

/** Нейтральна пігулка теми/рівня всередині EditorWindow, напр. "Middle · React". */
export function LevelChip({ children }: LevelChipProps) {
	return <span className={styles.levelChip}>{children}</span>;
}
