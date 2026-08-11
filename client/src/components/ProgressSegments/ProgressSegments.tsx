import styles from './ProgressSegments.module.css';

export interface ProgressSegmentsProps {
	total: number;
	/** Індекс поточного (0-based) незавершеного сегмента; сегменти до нього вважаються завершеними. */
	currentIndex: number;
}

/** Прогрес-бар "X із N" сегментами замість одного заповнення. */
export function ProgressSegments({ total, currentIndex }: ProgressSegmentsProps) {
	return (
		<div
			className={styles.row}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={currentIndex}
		>
			{Array.from({ length: total }, (_, index) => (
				<span
					key={index}
					className={[styles.segment, index < currentIndex ? styles.done : null]
						.filter(Boolean)
						.join(' ')}
				/>
			))}
		</div>
	);
}
