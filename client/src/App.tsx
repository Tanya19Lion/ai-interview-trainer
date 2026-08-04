import {
	Badge,
	Button,
	Chip,
	CodeDiffLine,
	EditorWindow,
	Eyebrow,
	LevelChip,
	ScoreChip,
	Spinner,
} from './components';

function App() {
	return (
		<main
			style={{
				padding: 'var(--space-5)',
				display: 'grid',
				gap: 'var(--space-4)',
				maxWidth: 640,
				marginInline: 'auto',
			}}
		>
			<Eyebrow>design system</Eyebrow>
			<h1 style={{ fontFamily: 'var(--font-display)' }}>diff — вітрина компонентів</h1>

			<div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
				<Button variant="primary">Почати тренування</Button>
				<Button variant="ghost">Скасувати</Button>
				<Button variant="primary" size="sm" disabled>
					<Spinner variant="on-primary" /> Завантаження
				</Button>
				<Chip>#react</Chip>
				<Badge label="точність" tone="good">
					78%
				</Badge>
				<Badge label="🔥 серія" tone="amber">
					14 днів
				</Badge>
			</div>

			<EditorWindow
				title={
					<>
						<b>session_04</b> · react/middle/answer.md
					</>
				}
				footer={
					<>
						<ScoreChip tone="mid">Точність: 6/10</ScoreChip>
						<LevelChip>Middle · React</LevelChip>
					</>
				}
			>
				<CodeDiffLine gutter={12} variant="question">
					// Q: Чим useMemo відрізняється від useCallback?
				</CodeDiffLine>
				<CodeDiffLine gutter={13} variant="removed">
					useMemo кешує функцію, а useCallback кешує значення.
				</CodeDiffLine>
				<CodeDiffLine gutter={13} variant="added">
					useMemo кешує значення (результат обчислення), а useCallback — саму функцію.
				</CodeDiffLine>
			</EditorWindow>
		</main>
	);
}

export default App;
