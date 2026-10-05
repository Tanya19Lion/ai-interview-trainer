import { useTranslation } from 'react-i18next';
import { LEVELS, type Level } from '../../types/interview';
import styles from './LevelPicker.module.css';

const LEVEL_META: Record<Level, { name: string; descKey: string; color: string }> = {
	junior: { name: 'Junior', descKey: 'progress.junior', color: 'var(--green)' },
	middle: { name: 'Middle', descKey: 'progress.middle', color: 'var(--amber)' },
	senior: { name: 'Senior', descKey: 'progress.senior', color: 'var(--plum)' },
};

export interface LevelPickerProps {
	value: Level | null;
	onChange: (level: Level) => void;
}

export function LevelPicker({ value, onChange }: LevelPickerProps) {
	const { t } = useTranslation();
	return (
		<div className={styles.grid} role="radiogroup" aria-label={t('picker.levelAria')}>
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
							<div className={styles.desc}>{t(meta.descKey)}</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
