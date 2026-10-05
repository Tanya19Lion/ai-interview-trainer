import { useTranslation } from 'react-i18next';
import { formatCompletedAt } from '../../lib/formatCompletedAt';
import { LEVEL_LABEL } from '../../lib/levelLabel';
import { TOPIC_LABEL } from '../../lib/topicLabel';
import type { HistorySessionSummary } from '../../types/interview';
import styles from './HistoryTable.module.css';

export interface HistoryTableProps {
	sessions: HistorySessionSummary[];
	onReview: (id: string) => void;
}

export function HistoryTable({ sessions, onReview }: HistoryTableProps) {
	const { t } = useTranslation();
	if (sessions.length === 0) {
		return (
			<p className={styles.empty}>{t('hist.empty')}</p>
		);
	}

	return (
		<table className={styles.table}>
			<thead>
				<tr>
					<th>{t('hist.colTopic')}</th>
					<th>{t('hist.colLevel')}</th>
					<th>{t('hist.colDate')}</th>
					<th>{t('hist.colScore')}</th>
					<th>{t('hist.colStatus')}</th>
					<th>{t('hist.colActions')}</th>
				</tr>
			</thead>
			<tbody>
				{sessions.map((session) => {
					const passed = (session.averageScore ?? 0) >= 7;
					return (
						<tr key={session.id}>
							<td data-label={t('hist.colTopic')} className={styles.topic}>
								{TOPIC_LABEL[session.topic]}
							</td>
							<td data-label={t('hist.colLevel')}>{LEVEL_LABEL[session.level]}</td>
							<td data-label={t('hist.colDate')}>{formatCompletedAt(session.completedAt)}</td>
							<td data-label={t('hist.colScore')} className={styles.score}>
								{session.averageScore !== undefined ? `${session.averageScore.toFixed(1)}/10` : '—'}
							</td>
							<td data-label={t('hist.colStatus')}>
								<span
									className={[styles.statusBadge, passed ? styles.pass : styles.retry].join(' ')}
								>
									{passed ? t('hist.pass') : t('hist.retry')}
								</span>
							</td>
							<td data-label={t('hist.colActions')}>
								<button type="button" className={styles.reviewLink} onClick={() => onReview(session.id)}>
									{t('hist.view')}
								</button>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
