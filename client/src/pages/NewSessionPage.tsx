import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Eyebrow, LevelPicker, TopicPicker } from '../components';
import { useStartSession } from '../hooks/useStartSession';
import type { Level, Topic } from '../types/interview';

export function NewSessionPage() {
	const navigate = useNavigate();
	const [topic, setTopic] = useState<Topic | null>(null);
	const [level, setLevel] = useState<Level | null>(null);
	const startSession = useStartSession();

	function handleStart() {
		if (!topic || !level) return;
		startSession.mutate(
			{ topic, level },
			{
				onSuccess: (session) => {
					navigate(`/interview/${session.sessionId}`, {
						state: {
							topic,
							level,
							question: session.question,
							questionIndex: session.questionIndex,
							totalQuestions: session.totalQuestions,
						},
					});
				},
			},
		);
	}

	return (
		<div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 760, marginInline: 'auto' }}>
			<div>
				<Eyebrow>нова співбесіда</Eyebrow>
				<h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--off-white)' }}>
					Обери тему та рівень складності
				</h1>
			</div>

			<TopicPicker value={topic} onChange={setTopic} />
			<LevelPicker value={level} onChange={setLevel} />

			{startSession.isError && (
				<p style={{ color: 'var(--rust)' }}>Не вдалося створити сесію. Спробуй ще раз.</p>
			)}

			<Button
				variant="primary"
				size="lg"
				disabled={!topic || !level || startSession.isPending}
				onClick={handleStart}
			>
				{startSession.isPending ? 'Створюємо сесію…' : 'Почати співбесіду →'}
			</Button>
		</div>
	);
}
