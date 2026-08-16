import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Eyebrow, Spinner } from '../components';
import { useLogout, useMe } from '../hooks/useAuth';
import { useActiveSession } from '../hooks/useActiveSession';
import { useHistory } from '../hooks/useHistory';
import { useStats } from '../hooks/useStats';
import { scoreTone } from '../lib/scoreTone';
import { TOPIC_LABEL } from '../lib/topicLabel';
import type { Level } from '../types/interview';
import styles from './HomePage.module.css';

const LEVEL_LABEL: Record<Level, string> = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

function mostFrequentLevel(levels: Level[]): Level | null {
	if (levels.length === 0) return null;
	const counts = new Map<Level, number>();
	for (const level of levels) counts.set(level, (counts.get(level) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function HomePage() {
	const navigate = useNavigate();
	const me = useMe();
	const logout = useLogout();
	const activeSession = useActiveSession();
	const stats = useStats();
	const history = useHistory();

	const user = me.data?.user;
	const recentSessions = history.data?.sessions.slice(0, 5) ?? [];
	const typicalLevel = mostFrequentLevel(history.data?.sessions.map((s) => s.level) ?? []);
	const strongestTopic = stats.data?.byTopic[0]?.topic;

	return (
		<div className={styles.page}>
			<div className={styles.head}>
				<Eyebrow>$ diff --whoami</Eyebrow>
				<h1 className={styles.h1}>Кабінет</h1>
			</div>

			<div className={styles.grid}>
				<aside className={styles.profileCard}>
					<div className={styles.avatar}>
						{user?.avatarUrl ? (
							<img src={user.avatarUrl} alt="" className={styles.avatarImg} />
						) : (
							(user?.name ?? '?').charAt(0).toUpperCase()
						)}
					</div>
					<h3 className={styles.name}>{user?.name}</h3>
					<div className={styles.meta}>{user?.email}</div>
					{typicalLevel && <span className={styles.levelTag}>рівень: {LEVEL_LABEL[typicalLevel]}</span>}
					<div className={styles.divider} />
					<button type="button" className={styles.profileLink} onClick={() => logout.mutate()}>
						Вийти
					</button>
				</aside>

				<div className={styles.main}>
					{stats.data && (
						<div className={styles.badgeRow}>
							<Badge label="сесій" tone="good">
								{stats.data.totalSessions}
							</Badge>
							{stats.data.overallAccuracy !== null && (
								<Badge label="точність" tone="good">
									{Math.round(stats.data.overallAccuracy * 100)}%
								</Badge>
							)}
							{stats.data.streakDays > 0 && (
								<Badge label="🔥 серія" tone="amber">
									{stats.data.streakDays} {stats.data.streakDays === 1 ? 'день' : 'днів'}
								</Badge>
							)}
							{strongestTopic && <Badge label="сильна тема">{TOPIC_LABEL[strongestTopic]}</Badge>}
						</div>
					)}

					{activeSession.data ? (
						<div className={styles.resumeCard}>
							<span className={styles.resumeLabel}>продовжити з того, де зупинились</span>
							<div className={styles.resumeLine}>
								<span className={styles.branch}>
									{activeSession.data.topic}/{activeSession.data.level}
								</span>
								<span className={styles.sep}>·</span>
								<span>
									{activeSession.data.questionIndex + 1}/{activeSession.data.totalQuestions}
								</span>
							</div>
							<div className={styles.ctaRow}>
								<Button
									variant="primary"
									onClick={() =>
										navigate(`/interview/${activeSession.data!.sessionId}`, {
											state: {
												topic: activeSession.data!.topic,
												level: activeSession.data!.level,
												question: activeSession.data!.question,
												questionIndex: activeSession.data!.questionIndex,
												totalQuestions: activeSession.data!.totalQuestions,
											},
										})
									}
								>
									Продовжити тренування →
								</Button>
								<Button variant="ghost" onClick={() => navigate('/interview/new')}>
									Обрати нову тему
								</Button>
							</div>
						</div>
					) : (
						!activeSession.isLoading && (
							<div className={styles.resumeCard}>
								<span className={styles.resumeLabel}>немає активної сесії</span>
								<div className={styles.ctaRow}>
									<Button variant="primary" onClick={() => navigate('/interview/new')}>
										Почати співбесіду →
									</Button>
								</div>
							</div>
						)
					)}

					<div className={styles.card}>
						<h3 className={styles.cardTitle}>останні сесії</h3>
						{history.isLoading ? (
							<Spinner />
						) : recentSessions.length === 0 ? (
							<p className={styles.empty}>Ще немає завершених сесій.</p>
						) : (
							<div className={styles.recentList}>
								{recentSessions.map((session) => (
									<div key={session.id} className={styles.recentItem}>
										<div>
											<div className={styles.recentTopic}>
												{TOPIC_LABEL[session.topic]} · {session.level}
											</div>
											<div className={styles.recentSub}>
												{session.completedAt
													? new Date(session.completedAt).toLocaleDateString('uk-UA')
													: '—'}
											</div>
										</div>
										{session.averageScore !== undefined && (
											<span
												className={[
													styles.recentScore,
													scoreTone(session.averageScore) === 'low' ? styles.low : styles.good,
												].join(' ')}
											>
												{session.averageScore.toFixed(1)}/10
											</span>
										)}
									</div>
								))}
							</div>
						)}
					</div>

					<div className={styles.links}>
						<Link to="/history" className={styles.linkCard}>
							<span className={styles.linkTitle}>Уся історія →</span>
							<span className={styles.linkDesc}>
								{stats.data ? `${stats.data.totalSessions} пройдених співбесід ` : ''}з фільтрами за
								темою й рівнем
							</span>
						</Link>
						<Link to="/progress" className={styles.linkCard}>
							<span className={styles.linkTitle}>Детальна статистика →</span>
							<span className={styles.linkDesc}>
								Графік активності, точність за темами, тренд і рекомендації
							</span>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
