import { useTranslation } from 'react-i18next';
import { Badge, Eyebrow, Heatmap, Spinner } from '../components';
import { useHistory } from '../hooks/useHistory';
import { useStats } from '../hooks/useStats';
import { LEVEL_LABEL } from '../lib/levelLabel';
import { scoreTone } from '../lib/scoreTone';
import { TOPIC_LABEL } from '../lib/topicLabel';
import type { Level } from '../types/interview';
import styles from './ProgressPage.module.css';

const LEVEL_META: Record<Level, { label: string; color: string }> = {
	junior: { label: LEVEL_LABEL.junior, color: 'var(--green)' },
	middle: { label: LEVEL_LABEL.middle, color: 'var(--amber)' },
	senior: { label: LEVEL_LABEL.senior, color: 'var(--plum)' },
};

const TREND_SIZE = 10;
const RECOMMENDATION_THRESHOLD = 0.8;
const RECOMMENDATION_LIMIT = 2;

export function ProgressPage() {
	const { t } = useTranslation();
	const stats = useStats();
	const history = useHistory();

	if (stats.isLoading || history.isLoading) {
		return (
			<div className={styles.loading}>
				<Spinner />
			</div>
		);
	}

	const sessions = history.data?.sessions ?? [];

	const trendSessions = [...sessions]
		.filter((s) => s.completedAt && s.averageScore !== undefined)
		.sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
		.slice(-TREND_SIZE);

	const levelCounts: Record<Level, number> = { junior: 0, middle: 0, senior: 0 };
	for (const session of sessions) levelCounts[session.level] += 1;
	const totalForLevels = sessions.length;

	const recommendations = (stats.data?.byTopic ?? [])
		.filter((topicStat) => topicStat.accuracy < RECOMMENDATION_THRESHOLD)
		.sort((a, b) => a.accuracy - b.accuracy)
		.slice(0, RECOMMENDATION_LIMIT);

	return (
		<div className={styles.page}>
			<div className={styles.head}>
				<Eyebrow>$ diff --stats</Eyebrow>
				<h1 className={styles.h1}>{t('stats.h1')}</h1>
				<p className={styles.subtitle}>
					{t('stats.subtitle')}
				</p>
			</div>

			{stats.data && (
				<div className={styles.badgeRow}>
					{stats.data.overallAccuracy !== null && (
						<Badge label={t('stats.accuracy')} tone="good">
							{Math.round(stats.data.overallAccuracy * 100)}%
						</Badge>
					)}
					{stats.data.streakDays > 0 && (
						<Badge label={t('stats.streak')} tone="amber">
							{t('stats.streakDays', { count: stats.data.streakDays })}
						</Badge>
					)}
					<Badge label={t('stats.totalSessions')}>{stats.data.totalSessions}</Badge>
					{stats.data.byTopic[0] && (
						<Badge label={t('stats.strongTopic')} tone="good">
							{TOPIC_LABEL[stats.data.byTopic[0].topic]}
						</Badge>
					)}
				</div>
			)}

			{stats.data && <Heatmap activityByDay={stats.data.activityByDay} today={stats.data.today} />}

			<div className={styles.twoCol}>
				<div className={styles.card}>
					<h3 className={styles.cardTitle}>{t('stats.byTopic')}</h3>
					{stats.data && stats.data.byTopic.length > 0 ? (
						stats.data.byTopic.map((topicStat) => (
							<div key={topicStat.topic} className={styles.barRow}>
								<span className={styles.barName}>{TOPIC_LABEL[topicStat.topic]}</span>
								<div className={styles.track}>
									<span
										className={[styles.fill, styles[scoreTone(topicStat.accuracy * 10)]].join(' ')}
										style={{ width: `${Math.round(topicStat.accuracy * 100)}%` }}
									/>
								</div>
								<span className={styles.barVal}>{Math.round(topicStat.accuracy * 100)}%</span>
							</div>
						))
					) : (
						<p className={styles.empty}>{t('stats.noTopics')}</p>
					)}
				</div>

				<div className={styles.card}>
					<h3 className={styles.cardTitle}>{t('stats.trendTitle', { count: TREND_SIZE })}</h3>
					{trendSessions.length >= 2 ? (
						<TrendChart sessions={trendSessions} />
					) : (
						<p className={styles.empty}>{t('stats.noTrend')}</p>
					)}
				</div>
			</div>

			{recommendations.length > 0 && (
				<div className={styles.card}>
					<h3 className={styles.cardTitle}>{t('stats.recommend')}</h3>
					<div className={styles.recoList}>
						{recommendations.map((rec) => (
							<div
								key={rec.topic}
								className={[styles.recoCard, rec.accuracy < 0.5 ? styles.recoRust : styles.recoAmber].join(
									' ',
								)}
							>
								<div className={styles.recoTitle}>
									{t('stats.recAttempts', {
											topic: TOPIC_LABEL[rec.topic],
											pct: Math.round(rec.accuracy * 100),
											count: rec.count,
										})}
								</div>
								<div className={styles.recoDesc}>
									{t('stats.recNote')}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className={styles.card}>
				<h3 className={styles.cardTitle}>{t('stats.levels')}</h3>
				{totalForLevels > 0 ? (
					<>
						<div className={styles.levelBar}>
							{(Object.keys(LEVEL_META) as Level[]).map((level) =>
								levelCounts[level] > 0 ? (
									<span
										key={level}
										style={{
											width: `${(levelCounts[level] / totalForLevels) * 100}%`,
											background: LEVEL_META[level].color,
										}}
									/>
								) : null,
							)}
						</div>
						<div className={styles.levelLegend}>
							{(Object.keys(LEVEL_META) as Level[]).map((level) => (
								<span key={level} className={styles.legendItem}>
									<span className={styles.legendDot} style={{ background: LEVEL_META[level].color }} />
									{LEVEL_META[level].label} · {levelCounts[level]}
								</span>
							))}
						</div>
					</>
				) : (
					<p className={styles.empty}>{t('common.noneCompleted')}</p>
				)}
			</div>

			<p className={styles.footerNote}>{t('common.tagline')}</p>
		</div>
	);
}

function TrendChart({
	sessions,
}: {
	sessions: { averageScore?: number; completedAt?: string }[];
}) {
	const { t } = useTranslation();
	const scores =sessions.map((s) => s.averageScore ?? 0);
	const points = scores.map((score, i) => {
		const x = scores.length === 1 ? 4 : 4 + i * (252 / (scores.length - 1));
		const y = 82 - (score / 10) * 74;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});
	const last = points[points.length - 1].split(',').map(Number);
	const firstPct = Math.round(scores[0] * 10);
	const lastPct = Math.round(scores[scores.length - 1] * 10);

	return (
		<div className={styles.trendWrap}>
			<svg
				viewBox="0 0 280 90"
				width="100%"
				height="90"
				role="img"
				aria-label={t('stats.trendAria', { first: firstPct, last: lastPct })}
			>
				<polyline
					points={points.join(' ')}
					fill="none"
					stroke="#4C9A5D"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<circle cx={last[0]} cy={last[1]} r="3.5" fill="#4C9A5D" />
			</svg>
			<div className={styles.trendLabels}>
				<span>{t('stats.trendAgo', { count: sessions.length, pct: firstPct })}</span>
				<span>{t('stats.today', { pct: lastPct })}</span>
			</div>
		</div>
	);
}
