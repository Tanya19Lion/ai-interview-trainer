import { LEVELS, type Level } from '../../types/interview';
import styles from './LevelPicker.module.css';

const LEVEL_META: Record<Level, { name: string; desc: string; color: string }> = {
	junior: {
		name: 'Junior',
		desc: 'Основи мови й фреймворку, типові патерни.',
		color: 'var(--green)',
	},
	middle: {
		name: 'Middle',
		desc: 'Нюанси, оптимізація, поширені підводні камені.',
		color: 'var(--amber)',
	},
	senior: {
		name: 'Senior',
		desc: 'Архітектура, компроміси, обґрунтування рішень.',
		color: 'var(--plum)',
	},
};

export interface LevelPickerProps {
	value: Level | null;
	onChange: (level: Level) => void;
}

export function LevelPicker({ value, onChange }: LevelPickerProps) {
	return (
		<div className={styles.grid} role="radiogroup" aria-label="Рівень складності">
			{LEVELS.map((level) => {
				const meta = LEVEL_META[level];
				const selected = value === level;
				return (
					<button
						key={level}
						type="button"
						role="radio"
						aria-checked={selected}
						className={[styles.card, selected ? styles.selected : null].filter(Boolean).join(' ')}
						onClick={() => onChange(level)}
					>
						<span className={styles.dot} style={{ background: meta.color }} />
						<div>
							<div className={styles.name}>{meta.name}</div>
							<div className={styles.desc}>{meta.desc}</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
