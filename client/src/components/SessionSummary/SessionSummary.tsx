import { Badge, ScoreChip } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { scoreTone } from '../../lib/scoreTone';
import type { Level, Topic } from '../../types/interview';
import styles from './SessionSummary.module.css';

export interface SessionResult {
	question: string;
	score: number;
	skipped: boolean;
	weakTopics: string[];
}

export interface SessionSummaryProps {
	topic: Topic;
	level: Level;
	averageScore: number;
	results: SessionResult[];
	onRestart: () => void;
	onHome: () => void;
}

export function SessionSummary({
	topic,
	level,
	averageScore,
	results,
	onRestart,
	onHome,
}: SessionSummaryProps) {
	const weakTopics = [...new Set(results.flatMap((result) => result.weakTopics))].slice(0, 3);

	return (
		<div className={styles.summary}>
			<div className={styles.score}>
				<span className={styles.big}>{averageScore.toFixed(1)}</span>
				<span className={styles.lbl}>
					середній бал · {topic}/{level}
				</span>
			</div>

			<div className={styles.list}>
				{results.map((result, index) => (
					<div key={index} className={styles.row}>
						<span className={styles.question}>{result.question}</span>
						<ScoreChip tone={result.skipped ? 'low' : scoreTone(result.score)}>
							{result.skipped ? 'пропущено' : `${result.score}/10`}
						</ScoreChip>
					</div>
				))}
			</div>

			{weakTopics.length > 0 && (
				<div className={styles.weak}>
					<span className={styles.weakLabel}>рекомендовано підтягнути:</span>
					{weakTopics.map((weakTopic) => (
						<Badge key={weakTopic} tone="amber">
							{weakTopic}
						</Badge>
					))}
				</div>
			)}

			<div className={styles.actions}>
				<Button variant="primary" onClick={onRestart}>
					Ще одна сесія
				</Button>
				<Button variant="ghost" onClick={onHome}>
					На головну
				</Button>
			</div>
		</div>
	);
}
