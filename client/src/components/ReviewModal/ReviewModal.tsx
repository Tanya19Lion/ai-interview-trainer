import { useEffect } from 'react';
import { CodeDiffLine } from '../CodeDiffLine/CodeDiffLine';
import { EditorComment } from '../EditorComment/EditorComment';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { LevelChip, ScoreChip } from '../Badge/Badge';
import { Spinner } from '../Spinner/Spinner';
import { useSessionDetail } from '../../hooks/useSessionDetail';
import { scoreTone } from '../../lib/scoreTone';
import { TOPIC_LABEL } from '../../lib/topicLabel';
import styles from './ReviewModal.module.css';

export interface ReviewModalProps {
	sessionId: string;
	onClose: () => void;
}

export function ReviewModal({ sessionId, onClose }: ReviewModalProps) {
	const detail = useSessionDetail(sessionId);

	useEffect(() => {
		document.body.style.overflow = 'hidden';
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') onClose();
		}
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = '';
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [onClose]);

	return (
		<div
			className={styles.overlay}
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className={styles.modalCard}>
				<button type="button" className={styles.close} aria-label="Закрити" onClick={onClose}>
					✕
				</button>

				{detail.isLoading || !detail.data ? (
					<div className={styles.loading}>
						<Spinner />
					</div>
				) : (
					<EditorWindow
						title={
							<>
								<b>session</b> · {TOPIC_LABEL[detail.data.topic]}/{detail.data.level}/answer.md
							</>
						}
						footer={
							detail.data.averageScore !== undefined ? (
								<>
									<ScoreChip tone={scoreTone(detail.data.averageScore)}>
										Точність: {detail.data.averageScore.toFixed(1)}/10
									</ScoreChip>
									<LevelChip>
										{detail.data.level} · {TOPIC_LABEL[detail.data.topic]}
									</LevelChip>
								</>
							) : undefined
						}
					>
						{detail.data.questions.map((question, index) => {
							const skipped = question.answer === '';
							return (
								<div key={index} className={styles.questionBlock}>
									<CodeDiffLine gutter="·" variant="question">
										{question.question}
									</CodeDiffLine>
									{!skipped && (
										<CodeDiffLine gutter="·" label="Ось твоя відповідь">
											{question.answer}
										</CodeDiffLine>
									)}
									<CodeDiffLine
										gutter="+"
										variant="added"
										label={skipped ? 'Ось відповідь на питання' : 'Краща відповідь'}
									>
										{question.correctAnswer}
									</CodeDiffLine>
									<EditorComment>
										{skipped
											? 'Це питання не вплинуло на результат сесії — воно не враховане в середньому балі.'
											: question.feedback}
									</EditorComment>
								</div>
							);
						})}
					</EditorWindow>
				)}
			</div>
		</div>
	);
}
