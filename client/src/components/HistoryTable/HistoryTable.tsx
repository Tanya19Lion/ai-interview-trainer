import { TOPIC_LABEL } from '../../lib/topicLabel';
import type { HistorySessionSummary, Level } from '../../types/interview';
import styles from './HistoryTable.module.css';

const LEVEL_LABEL: Record<Level, string> = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

export interface HistoryTableProps {
	sessions: HistorySessionSummary[];
	onReview: (id: string) => void;
}

export function HistoryTable({ sessions, onReview }: HistoryTableProps) {
	if (sessions.length === 0) {
		return (
			<p className={styles.empty}>Нічого не знайдено за цим фільтром. Спробуй інше поєднання теми й рівня.</p>
		);
	}

	return (
		<table className={styles.table}>
			<thead>
				<tr>
					<th>Тема</th>
					<th>Рівень</th>
					<th>Дата</th>
					<th>Оцінка</th>
					<th>Статус</th>
					<th>Дії</th>
				</tr>
			</thead>
			<tbody>
				{sessions.map((session) => {
					const passed = (session.averageScore ?? 0) >= 7;
					return (
						<tr key={session.id}>
							<td data-label="Тема" className={styles.topic}>
								{TOPIC_LABEL[session.topic]}
							</td>
							<td data-label="Рівень">{LEVEL_LABEL[session.level]}</td>
							<td data-label="Дата">
								{session.completedAt ? new Date(session.completedAt).toLocaleDateString('uk-UA') : '—'}
							</td>
							<td data-label="Оцінка" className={styles.score}>
								{session.averageScore !== undefined ? `${session.averageScore.toFixed(1)}/10` : '—'}
							</td>
							<td data-label="Статус">
								<span
									className={[styles.statusBadge, passed ? styles.pass : styles.retry].join(' ')}
								>
									{passed ? 'схвалено' : 'повторити'}
								</span>
							</td>
							<td data-label="Дії">
								<button type="button" className={styles.reviewLink} onClick={() => onReview(session.id)}>
									переглянути
								</button>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
