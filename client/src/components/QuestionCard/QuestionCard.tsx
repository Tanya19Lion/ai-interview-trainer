import { CodeDiffLine } from '../CodeDiffLine/CodeDiffLine';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { LevelChip } from '../Badge/Badge';
import { TOPIC_LABEL } from '../../lib/topicLabel';
import type { Level, Topic } from '../../types/interview';

export interface QuestionCardProps {
	topic: Topic;
	level: Level;
	questionIndex: number;
	question: string;
}

export function QuestionCard({ topic, level, questionIndex, question }: QuestionCardProps) {
	return (
		<EditorWindow
			title={
				<>
					<b>question_{questionIndex + 1}</b> · {TOPIC_LABEL[topic]}/{level}/interview.md
				</>
			}
			footer={
				<LevelChip>
					{level} · {TOPIC_LABEL[topic]}
				</LevelChip>
			}
		>
			<CodeDiffLine gutter={questionIndex + 1} variant="question">
				{question}
			</CodeDiffLine>
		</EditorWindow>
	);
}
