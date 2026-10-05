import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Eyebrow, LevelPicker, TopicPicker } from '../components';
import { useStartSession } from '../hooks/useStartSession';
import type { Level, Topic } from '../types/interview';

export function NewSessionPage() {
	const { t } = useTranslation();
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
				<Eyebrow>{t('new.eyebrow')}</Eyebrow>
				<h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
					{t('new.title')}
				</h1>
			</div>

			<TopicPicker value={topic} onChange={setTopic} />
			<LevelPicker value={level} onChange={setLevel} />

			{startSession.isError && (
				<p style={{ color: 'var(--rust-text)' }}>{t('new.error')}</p>
			)}

			<Button
				variant="primary"
				size="lg"
				disabled={!topic || !level || startSession.isPending}
				onClick={handleStart}
			>
				{startSession.isPending ? t('new.starting') : t('new.start')}
			</Button>
		</div>
	);
}
