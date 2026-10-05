import { useTranslation } from 'react-i18next';
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
	const { t } = useTranslation();
	return (
		<EditorWindow
			title={<>{t('card.title')}</>}
			footer={
				skipped ? (
					<LevelChip>
						{level} · {TOPIC_LABEL[topic]}
					</LevelChip>
				) : (
					<>
						<ScoreChip tone={scoreTone(score)}>{t('card.accuracy', { score })}</ScoreChip>
						<LevelChip>
							{level} · {TOPIC_LABEL[topic]}
						</LevelChip>
					</>
				)
			}
		>
			{!skipped && (
				<CodeDiffLine gutter="·" label={t('card.userAnswer')}>
					{userAnswer}
				</CodeDiffLine>
			)}
			<CodeDiffLine
				gutter="+"
				variant="added"
				label={skipped ? t('card.skippedAnswer') : t('card.betterAnswer')}
			>
				{correctAnswer}
			</CodeDiffLine>
			<EditorComment>
				{skipped
					? t('card.skippedNote')
					: feedback}
			</EditorComment>
		</EditorWindow>
	);
}
