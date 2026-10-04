import { CodeDiffLine } from '../CodeDiffLine/CodeDiffLine';
import { EditorComment } from '../EditorComment/EditorComment';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { LevelChip, ScoreChip } from '../Badge/Badge';
import { scoreTone } from '../../lib/scoreTone';
import { TOPIC_LABEL } from '../../lib/topicLabel';
import type { Level, Topic } from '../../types/interview';

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
				skipped ? (
					<LevelChip>
						{level} · {TOPIC_LABEL[topic]}
					</LevelChip>
				) : (
					<>
						<ScoreChip tone={scoreTone(score)}>Точність: {score}/10</ScoreChip>
						<LevelChip>
							{level} · {TOPIC_LABEL[topic]}
						</LevelChip>
					</>
				)
			}
		>
			{!skipped && (
				<CodeDiffLine gutter="·" label="Ось твоя відповідь">
					{userAnswer}
				</CodeDiffLine>
			)}
			<CodeDiffLine
				gutter="+"
				variant="added"
				label={skipped ? 'Ось відповідь на питання' : 'Краща відповідь'}
			>
				{correctAnswer}
			</CodeDiffLine>
			<EditorComment>
				{skipped
					? 'Це питання не впливає на результат сесії — воно не враховується в середньому балі. Повернись до цієї теми пізніше.'
					: feedback}
			</EditorComment>
		</EditorWindow>
	);
}
