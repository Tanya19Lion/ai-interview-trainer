import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnswerForm, Button, FeedbackCard, QuestionCard, SessionSummary, Spinner } from '../components';
import type { SessionResult } from '../components';
import { useActiveSession } from '../hooks/useActiveSession';
import { useSessionDetail } from '../hooks/useSessionDetail';
import { useSubmitAnswer } from '../hooks/useSubmitAnswer';
import { useInterviewFocus } from '../lib/interviewFocus';
import type { Level, Topic } from '../types/interview';

interface SessionBootstrap {
	topic: Topic;
	level: Level;
	question: string;
	questionIndex: number;
	totalQuestions: number;
}

interface CurrentReview {
	userAnswer: string;
	skipped: boolean;
	correctAnswer: string;
	feedback: string;
	score: number;
	done: boolean;
	nextQuestion?: string;
	nextQuestionIndex?: number;
	averageScore?: number;
}

export function InterviewSessionPage() {
	const { sessionId } = useParams<{ sessionId: string }>();
	const location = useLocation();
	const navigate = useNavigate();
	const bootstrapFromState = location.state as SessionBootstrap | null;

	// location.state is lost on a hard reload / direct link — reload fallback re-derives it from
	// the server instead of dead-ending on "session unavailable".
	const needsFetch = !bootstrapFromState && !!sessionId;
	const sessionDetail = useSessionDetail(needsFetch ? sessionId! : null);
	const needsActiveQuestion = needsFetch && sessionDetail.data?.status === 'in_progress';
	const activeSession = useActiveSession(needsActiveQuestion);

	const fetchedBootstrap: SessionBootstrap | null =
		needsActiveQuestion && activeSession.data && activeSession.data.sessionId === sessionId
			? {
					topic: activeSession.data.topic,
					level: activeSession.data.level,
					question: activeSession.data.question,
					questionIndex: activeSession.data.questionIndex,
					totalQuestions: activeSession.data.totalQuestions,
				}
			: null;
	const bootstrap = bootstrapFromState ?? fetchedBootstrap;

	const [question, setQuestion] = useState(bootstrap?.question ?? '');
	const [questionIndex, setQuestionIndex] = useState(bootstrap?.questionIndex ?? 0);
	const [answer, setAnswer] = useState('');
	const [review, setReview] = useState<CurrentReview | null>(null);
	const [results, setResults] = useState<SessionResult[]>([]);
	const [finalAverageScore, setFinalAverageScore] = useState<number | null>(null);

	const submitAnswer = useSubmitAnswer(sessionId ?? '');
	const { setFocus } = useInterviewFocus();

	const hydratedFromFetch = useRef(false);
	useEffect(() => {
		if (bootstrapFromState || hydratedFromFetch.current || !fetchedBootstrap) return;
		hydratedFromFetch.current = true;
		setQuestion(fetchedBootstrap.question);
		setQuestionIndex(fetchedBootstrap.questionIndex);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchedBootstrap]);

	useEffect(() => {
		if (!bootstrap || finalAverageScore !== null) {
			setFocus(null);
			return;
		}
		setFocus({
			questionIndex,
			totalQuestions: bootstrap.totalQuestions,
			branch: `${bootstrap.topic}/${bootstrap.level}`,
			onExit: () => {
				if (window.confirm('Завершити сесію достроково? Прогрес по поточному питанню не збережеться.')) {
					navigate('/interview/new');
				}
			},
		});
		return () => setFocus(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bootstrap, questionIndex, finalAverageScore]);

	if (!sessionId) {
		return (
			<div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: 480 }}>
				<p style={{ color: 'var(--slate)' }}>Сесія не знайдена — почни нову.</p>
				<Button variant="primary" onClick={() => navigate('/interview/new')}>
					Нова сесія
				</Button>
			</div>
		);
	}

	// Reload fallback: the session already finished before the page loaded — render its
	// persisted summary directly instead of trying to resume live answering.
	if (!bootstrap && needsFetch && sessionDetail.data?.status === 'completed') {
		const detail = sessionDetail.data;
		return (
			<SessionSummary
				topic={detail.topic}
				level={detail.level}
				averageScore={detail.averageScore ?? 0}
				results={detail.questions.map((q) => ({
					question: q.question,
					score: q.score,
					skipped: q.answer === '',
					weakTopics: q.weakTopics,
				}))}
				onRestart={() => navigate('/interview/new')}
				onHome={() => navigate('/')}
			/>
		);
	}

	if (!bootstrap && needsFetch && (sessionDetail.isLoading || activeSession.isLoading)) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6) 0' }}>
				<Spinner />
			</div>
		);
	}

	if (!bootstrap) {
		return (
			<div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: 480 }}>
				<p style={{ color: 'var(--slate)' }}>
					Ця сесія недоступна — можливо, вона вже неактивна. Почни нову.
				</p>
				<Button variant="primary" onClick={() => navigate('/interview/new')}>
					Нова сесія
				</Button>
			</div>
		);
	}

	const { topic, level } = bootstrap;

	function submit(currentAnswer: string, skipped: boolean) {
		submitAnswer.mutate(
			{ question, answer: currentAnswer },
			{
				onSuccess: (response) => {
					setReview({
						userAnswer: currentAnswer,
						skipped,
						correctAnswer: response.review.correctAnswer,
						feedback: response.review.feedback,
						score: response.review.score,
						done: response.done,
						nextQuestion: response.question,
						nextQuestionIndex: response.questionIndex,
						averageScore: response.averageScore,
					});
					setResults((prev) => [
						...prev,
						{
							question,
							score: response.review.score,
							skipped,
							weakTopics: response.review.weakTopics,
						},
					]);
				},
			},
		);
	}

	function handleContinue() {
		if (!review) return;
		if (review.done) {
			setFinalAverageScore(review.averageScore ?? 0);
			return;
		}
		setQuestion(review.nextQuestion ?? '');
		setQuestionIndex(review.nextQuestionIndex ?? questionIndex + 1);
		setReview(null);
		setAnswer('');
	}

	if (finalAverageScore !== null) {
		return (
			<SessionSummary
				topic={topic}
				level={level}
				averageScore={finalAverageScore}
				results={results}
				onRestart={() => navigate('/interview/new')}
				onHome={() => navigate('/')}
			/>
		);
	}

	return (
		<div style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: 760, marginInline: 'auto' }}>
			<QuestionCard topic={topic} level={level} questionIndex={questionIndex} question={question} />

			{!review ? (
				<AnswerForm
					value={answer}
					onChange={setAnswer}
					onSubmit={() => submit(answer, false)}
					onSkip={() => submit('', true)}
					pending={submitAnswer.isPending}
				/>
			) : (
				<>
					<FeedbackCard
						topic={topic}
						level={level}
						userAnswer={review.userAnswer}
						skipped={review.skipped}
						correctAnswer={review.correctAnswer}
						feedback={review.feedback}
						score={review.score}
					/>
					<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
						<Button variant="primary" onClick={handleContinue}>
							{review.done ? 'Переглянути підсумок →' : 'Наступне питання →'}
						</Button>
					</div>
				</>
			)}

			{submitAnswer.isError && (
				<p style={{ color: 'var(--rust)' }}>Не вдалося перевірити відповідь. Спробуй ще раз.</p>
			)}
		</div>
	);
}
