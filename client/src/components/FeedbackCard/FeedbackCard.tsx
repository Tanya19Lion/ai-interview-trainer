import { CodeDiffLine } from '../CodeDiffLine/CodeDiffLine';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { LevelChip, ScoreChip } from '../Badge/Badge';
import { scoreTone } from '../../lib/scoreTone';
import type { Level, Topic } from '../../types/interview';
import styles from './FeedbackCard.module.css';

export interface FeedbackCardProps {
	topic: Topic;
	level: Level;
	userAnswer: string;
	skipped: boolean;
	correctAnswer: string;
	feedback: string;
	score: number;
}

export function FeedbackCard({
	topic,
	level,
	userAnswer,
	skipped,
	correctAnswer,
	feedback,
	score,
}: FeedbackCardProps) {
	return (
		<EditorWindow
			title={<>AI reviewer · рев'ю відповіді</>}
			footer={
				<>
					<ScoreChip tone={scoreTone(score)}>Точність: {score}/10</ScoreChip>
					<LevelChip>
						{level} · {topic}
					</LevelChip>
				</>
			}
		>
			<CodeDiffLine gutter="−" variant="removed">
				{skipped ? 'Відповідь не надана.' : userAnswer}
			</CodeDiffLine>
			<CodeDiffLine gutter="+" variant="added">
				{correctAnswer}
			</CodeDiffLine>
			<div className={styles.commentBlock}>
				<span className={styles.who}>AI reviewer</span>
				{skipped
					? 'Нічого страшного — ось як варто відповісти. Повернись до цієї теми пізніше.'
					: feedback}
			</div>
		</EditorWindow>
	);
}
