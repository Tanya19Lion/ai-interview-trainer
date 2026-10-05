import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eyebrow, HistoryTable, ReviewModal } from '../components';
import { useHistory } from '../hooks/useHistory';
import { LEVEL_LABEL } from '../lib/levelLabel';
import { TOPIC_LABEL } from '../lib/topicLabel';
import { LEVELS, TOPICS, type Level, type Topic } from '../types/interview';
import styles from './HistoryPage.module.css';

export function HistoryPage() {
	const { t } = useTranslation();
	const [topic, setTopic] = useState<Topic | null>(null);
	const [level, setLevel] = useState<Level | null>(null);
	const [reviewId, setReviewId] = useState<string | null>(null);

	const history = useHistory({ topic: topic ?? undefined, level: level ?? undefined });

	return (
		<div className={styles.page}>
			<div className={styles.head}>
				<Eyebrow>$ diff --log</Eyebrow>
				<h1 className={styles.h1}>{t('history.title')}</h1>
				<p className={styles.subtitle}>
					{t('history.subtitle')}
				</p>
			</div>

			<div className={styles.filterBar}>
				<div className={styles.filterGroup}>
					<span className={styles.fl}>{t('history.filterTopic')}</span>
					<button
						type="button"
						className={[styles.chip, topic === null ? styles.chipActive : null].filter(Boolean).join(' ')}
						onClick={() => setTopic(null)}
					>
						{t('history.all')}
					</button>
					{TOPICS.map((topicOption) => (
						<button
							key={topicOption}
							type="button"
							className={[styles.chip, topic === topicOption ? styles.chipActive : null].filter(Boolean).join(' ')}
							onClick={() => setTopic(topicOption)}
						>
							{TOPIC_LABEL[topicOption]}
						</button>
					))}
				</div>
				<div className={styles.filterGroup}>
					<span className={styles.fl}>{t('history.filterLevel')}</span>
					<button
						type="button"
						className={[styles.chip, styles.chipLvl, level === null ? styles.chipActive : null]
							.filter(Boolean)
							.join(' ')}
						onClick={() => setLevel(null)}
					>
						{t('history.all')}
					</button>
					{LEVELS.map((l) => (
						<button
							key={l}
							type="button"
							className={[styles.chip, styles.chipLvl, level === l ? styles.chipActive : null]
								.filter(Boolean)
								.join(' ')}
							onClick={() => setLevel(l)}
						>
							{LEVEL_LABEL[l]}
						</button>
					))}
				</div>
			</div>

			<div className={styles.tableCard}>
				<HistoryTable sessions={history.data?.sessions ?? []} onReview={setReviewId} />
			</div>

			{reviewId && <ReviewModal sessionId={reviewId} onClose={() => setReviewId(null)} />}
		</div>
	);
}
