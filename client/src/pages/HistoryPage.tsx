import { useState } from 'react';
import { Eyebrow, HistoryTable, ReviewModal } from '../components';
import { useHistory } from '../hooks/useHistory';
import { TOPIC_LABEL } from '../lib/topicLabel';
import { LEVELS, TOPICS, type Level, type Topic } from '../types/interview';
import styles from './HistoryPage.module.css';

const LEVEL_LABEL: Record<Level, string> = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

export function HistoryPage() {
	const [topic, setTopic] = useState<Topic | null>(null);
	const [level, setLevel] = useState<Level | null>(null);
	const [reviewId, setReviewId] = useState<string | null>(null);

	const history = useHistory({ topic: topic ?? undefined, level: level ?? undefined });

	return (
		<div className={styles.page}>
			<div className={styles.head}>
				<Eyebrow>$ diff --log</Eyebrow>
				<h1 className={styles.h1}>Історія проходжень</h1>
				<p className={styles.subtitle}>
					Кожна сесія — окремий запис: тема, рівень, оцінка й статус. Натисни «переглянути», щоб
					побачити рев'ю відповіді.
				</p>
			</div>

			<div className={styles.filterBar}>
				<div className={styles.filterGroup}>
					<span className={styles.fl}>тема:</span>
					<button
						type="button"
						className={[styles.chip, topic === null ? styles.chipActive : null].filter(Boolean).join(' ')}
						onClick={() => setTopic(null)}
					>
						Усі
					</button>
					{TOPICS.map((t) => (
						<button
							key={t}
							type="button"
							className={[styles.chip, topic === t ? styles.chipActive : null].filter(Boolean).join(' ')}
							onClick={() => setTopic(t)}
						>
							{TOPIC_LABEL[t]}
						</button>
					))}
				</div>
				<div className={styles.filterGroup}>
					<span className={styles.fl}>рівень:</span>
					<button
						type="button"
						className={[styles.chip, styles.chipLvl, level === null ? styles.chipActive : null]
							.filter(Boolean)
							.join(' ')}
						onClick={() => setLevel(null)}
					>
						Усі
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
