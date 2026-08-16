import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
	Chip,
	CodeDiffLine,
	EditorComment,
	EditorWindow,
	Eyebrow,
	LangOverlay,
	LevelChip,
	Reveal,
	ScoreChip,
} from '../components';
import { buttonClassName } from '../components/Button/buttonClassName';
import { LEVELS, TOPICS, type Level, type Topic } from '../types/interview';
import { TOPIC_LABEL } from '../lib/topicLabel';
import styles from './LandingPage.module.css';

const NAV_LINKS: { anchor: string; key: string }[] = [
	{ anchor: '#features', key: 'nav.features' },
	{ anchor: '#how', key: 'nav.how' },
	{ anchor: '#review', key: 'nav.review' },
	{ anchor: '#progress', key: 'nav.progress' },
];

const HOW_STEPS = [
	{ cmd: '$ git checkout -b interview/react-middle', h3: 'how.1.h3', p: 'how.1.p' },
	{ cmd: 'AI generate_question(topic, level)', h3: 'how.2.h3', p: 'how.2.p' },
	{ cmd: 'you → answer.md', h3: 'how.3.h3', p: 'how.3.p' },
	{ cmd: 'AI review(answer) → diff', h3: 'how.4.h3', p: 'how.4.p' },
	{ cmd: '$ git log --stats', h3: 'how.5.h3', p: 'how.5.p' },
];

const DEMO_HISTORY: { topic: Topic; level: Level; date: string; score: string; pass: boolean }[] = [
	{ topic: 'react', level: 'middle', date: '28.07.2026', score: '8/10', pass: true },
	{ topic: 'nodejs', level: 'senior', date: '25.07.2026', score: '5/10', pass: false },
	{ topic: 'typescript', level: 'junior', date: '20.07.2026', score: '9/10', pass: true },
	{ topic: 'javascript', level: 'middle', date: '15.07.2026', score: '7/10', pass: true },
];

const LEVEL_LABEL: Record<Level, string> = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

const HEAT_WEEKS = 26;
const HEAT_CELLS = HEAT_WEEKS * 7;

/** Той самий детермінований лінійний конгруентний генератор, що й у мокапі — щоб демо-heatmap
 * виглядав однаково між рендерами, а не тасувався щоразу як справжній Math.random(). */
function seededHeatLevels(seed: number, count: number): number[] {
	let s = seed;
	const rand = () => {
		s = (s * 9301 + 49297) % 233280;
		return s / 233280;
	};
	return Array.from({ length: count }, () => {
		const r = rand();
		if (r > 0.93) return 4;
		if (r > 0.82) return 3;
		if (r > 0.65) return 2;
		if (r > 0.45) return 1;
		return 0;
	});
}

export function LandingPage() {
	const { t } = useTranslation();
	const [navOpen, setNavOpen] = useState(false);
	const [demoTopic, setDemoTopic] = useState<Topic>('react');
	const [demoLevel, setDemoLevel] = useState<Level>('middle');

	const heatLevels = useMemo(() => seededHeatLevels(42, HEAT_CELLS), []);
	const heatGridRef = useRef<HTMLDivElement>(null);
	const [heatIn, setHeatIn] = useState(false);

	useEffect(() => {
		const el = heatGridRef.current;
		if (!el) return;
		if (!('IntersectionObserver' in window)) {
			setHeatIn(true);
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setHeatIn(true);
						io.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.2 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<div className={styles.page}>
			<LangOverlay />

			<nav className={styles.nav}>
				<div className={styles.navInner}>
					<a href="#top" className={styles.logo}>
						diff<span className={styles.cursor} aria-hidden="true" />
					</a>
					<ul className={[styles.navLinks, navOpen ? styles.navLinksOpen : null].filter(Boolean).join(' ')}>
						{NAV_LINKS.map((link) => (
							<li key={link.anchor}>
								<a href={link.anchor} onClick={() => setNavOpen(false)}>
									{t(link.key)}
								</a>
							</li>
						))}
					</ul>
					<div className={styles.navActions}>
						<button
							type="button"
							className={styles.navToggle}
							aria-label={t('nav.menuAria')}
							aria-expanded={navOpen}
							onClick={() => setNavOpen((v) => !v)}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path
									d="M2 4H14M2 8H14M2 12H14"
									stroke="currentColor"
									strokeWidth="1.4"
									strokeLinecap="round"
								/>
							</svg>
						</button>
						<Link to="/login" className={buttonClassName({ variant: 'ghost' })}>
							{t('nav.login')}
						</Link>
						<a href="#cta" className={buttonClassName({ variant: 'primary' })}>
							{t('nav.cta')}
						</a>
					</div>
				</div>
			</nav>

			<main id="top">
				<header className={styles.hero}>
					<div className={styles.heroGrid}>
						<div>
							<div className={styles.heroCli}>
								<span className={styles.prompt}>$</span>diff --interview react --level=middle
								<span className={styles.typeCursor} aria-hidden="true" />
							</div>
							<h1 className={styles.heroH1}>
								{t('hero.h1pre')}
								<span className={styles.hl}>{t('hero.h1hl')}</span>
								{t('hero.h1post')}
							</h1>
							<p className={styles.heroSub}>{t('hero.sub')}</p>
							<div className={styles.heroCta}>
								<Link to="/login" className={buttonClassName({ variant: 'primary', size: 'lg' })}>
									{t('hero.ctaPrimary')}
								</Link>
								<a href="#review" className={buttonClassName({ variant: 'ghost', size: 'lg' })}>
									{t('hero.ctaSecondary')}
								</a>
							</div>
							<div className={styles.heroTopics}>
								<span className={styles.topicsLabel}>{t('hero.topicsLabel')}</span>
								{TOPICS.slice(0, 6).map((topic) => (
									<Chip key={topic}>#{TOPIC_LABEL[topic]}</Chip>
								))}
							</div>
						</div>

						<EditorWindow
							title={
								<>
									<b>session_04</b> · react/middle/answer.md
								</>
							}
							footer={
								<div className={[styles.animLine, styles.l4].join(' ')}>
									<ScoreChip tone="mid">{t('hero.cardScore')}</ScoreChip>
									<LevelChip>Middle · React</LevelChip>
								</div>
							}
						>
							<CodeDiffLine gutter="12" variant="question">
								{t('hero.cardQ')}
							</CodeDiffLine>
							<div className={[styles.animLine, styles.l1].join(' ')}>
								<CodeDiffLine gutter="13" variant="removed">
									{t('hero.cardRemoved')}
								</CodeDiffLine>
							</div>
							<div className={[styles.animLine, styles.l2].join(' ')}>
								<CodeDiffLine gutter="13" variant="added">
									{t('hero.cardAdded')}
								</CodeDiffLine>
							</div>
							<div className={[styles.animLine, styles.l3].join(' ')}>
								<EditorComment>{t('hero.cardComment')}</EditorComment>
							</div>
						</EditorWindow>
					</div>
				</header>

				<section className={styles.section} id="how">
					<Reveal className={styles.sectionHead}>
						<Eyebrow>{t('how.eyebrow')}</Eyebrow>
						<h2 id="features" className={styles.sectionH2}>
							{t('how.h2')}
						</h2>
						<p className={styles.sectionP}>{t('how.p')}</p>
					</Reveal>

					<ol className={styles.logList}>
						{HOW_STEPS.map((step) => (
							<li key={step.h3} className={styles.logItem}>
								<Reveal>
									<span className={styles.logHash}>{step.cmd}</span>
									<h3 className={styles.logH3}>{t(step.h3)}</h3>
									<p className={styles.logP}>{t(step.p)}</p>
								</Reveal>
							</li>
						))}
					</ol>
				</section>

				<section className={styles.section} id="review">
					<Reveal className={styles.sectionHead}>
						<Eyebrow>{t('review.eyebrow')}</Eyebrow>
						<h2 className={styles.sectionH2}>{t('review.h2')}</h2>
						<p className={styles.sectionP}>{t('review.p')}</p>
					</Reveal>

					<div className={styles.demoGrid}>
						<Reveal className={styles.pickerCard}>
							<h3 className={styles.pickerH3}>{t('review.picker.h3')}</h3>
							<div className={styles.pickerRow}>
								{TOPICS.slice(0, 6).map((topic) => (
									<button
										key={topic}
										type="button"
										className={[styles.pill, demoTopic === topic ? styles.pillActive : null]
											.filter(Boolean)
											.join(' ')}
										onClick={() => setDemoTopic(topic)}
									>
										{TOPIC_LABEL[topic]}
									</button>
								))}
							</div>
							<div className={styles.pickerRow}>
								{LEVELS.map((level) => (
									<button
										key={level}
										type="button"
										className={[
											styles.pill,
											styles.pillLvl,
											demoLevel === level ? styles.pillActive : null,
										]
											.filter(Boolean)
											.join(' ')}
										onClick={() => setDemoLevel(level)}
									>
										{LEVEL_LABEL[level]}
									</button>
								))}
							</div>
							<div className={styles.pickerDivider} />
							<p className={styles.pickerNote}>{t('review.picker.note')}</p>
						</Reveal>

						<Reveal>
							<EditorWindow
								title={
									<>
										<b>session_04</b> · node.js/senior/answer.md
									</>
								}
								footer={
									<>
										<ScoreChip tone="mid">{t('review.cardScore')}</ScoreChip>
										<LevelChip>Senior · Node.js</LevelChip>
									</>
								}
							>
								<CodeDiffLine gutter="21" variant="question">
									{t('review.cardQ')}
								</CodeDiffLine>
								<CodeDiffLine gutter="22" variant="removed">
									{t('review.cardRemoved')}
								</CodeDiffLine>
								<CodeDiffLine gutter="22" variant="added">
									{t('review.cardAdded')}
								</CodeDiffLine>
								<EditorComment>{t('review.cardComment')}</EditorComment>
								<div className={styles.recoBlock}>
									<span className={styles.recoWho}>{t('review.recoLabel')}</span>
									Event Loop · Microtask queue · process.nextTick · Promise vs setTimeout
								</div>
							</EditorWindow>
						</Reveal>
					</div>
				</section>

				<section className={styles.section} id="progress">
					<Reveal className={styles.sectionHead}>
						<Eyebrow>{t('progress.eyebrow')}</Eyebrow>
						<h2 className={styles.sectionH2}>{t('progress.h2')}</h2>
						<p className={styles.sectionP}>{t('progress.p')}</p>
					</Reveal>

					<div className={styles.statsGrid}>
						<Reveal className={styles.heatmapCard}>
							<div className={styles.heatmapHead}>
								<span className={styles.heatCount}>
									<b>128</b> {t('progress.count')}
								</span>
								<span className={styles.heatLegend}>
									{t('progress.less')}
									<span className={styles.legendSwatch} data-level={0} />
									<span className={styles.legendSwatch} data-level={1} />
									<span className={styles.legendSwatch} data-level={2} />
									<span className={styles.legendSwatch} data-level={3} />
									<span className={styles.legendSwatch} data-level={4} />
									{t('progress.more')}
								</span>
							</div>
							<div className={styles.heatGrid} aria-hidden="true" ref={heatGridRef}>
								{heatLevels.map((level, index) => (
									<div
										key={index}
										className={styles.heatCell}
										data-level={level}
										data-in={heatIn}
										style={heatIn ? { transitionDelay: `${index * 4}ms` } : undefined}
										title={level === 0 ? t('heat.none') : `${level}/4 ${t('heat.intensity')}`}
									/>
								))}
							</div>

							<div className={styles.statRows}>
								<div className={styles.statRow}>
									<span className={styles.statK}>{t('progress.stat1')}</span>
									<span className={[styles.statV, styles.statPos].join(' ')}>78%</span>
								</div>
								<div className={styles.statRow}>
									<span className={styles.statK}>{t('progress.stat2')}</span>
									<span className={styles.statV}>React</span>
								</div>
								<div className={styles.statRow}>
									<span className={styles.statK}>{t('progress.stat3')}</span>
									<span className={[styles.statV, styles.statNeg].join(' ')}>System Design</span>
								</div>
								<div className={styles.statRow}>
									<span className={styles.statK}>{t('progress.stat4')}</span>
									<span className={[styles.statV, styles.statPos].join(' ')}>14</span>
								</div>
							</div>
						</Reveal>

						<Reveal className={styles.levelLegendCard}>
							<h3 className={styles.pickerH3}>{t('progress.levelsH3')}</h3>
							<div className={styles.levelRow}>
								<span className={styles.levelDot} style={{ background: 'var(--green)' }} />
								<span className={styles.levelName}>Junior</span>
								<span className={styles.levelDesc}>{t('progress.junior')}</span>
							</div>
							<div className={styles.levelRow}>
								<span className={styles.levelDot} style={{ background: 'var(--amber)' }} />
								<span className={styles.levelName}>Middle</span>
								<span className={styles.levelDesc}>{t('progress.middle')}</span>
							</div>
							<div className={styles.levelRow}>
								<span className={styles.levelDot} style={{ background: 'var(--plum)' }} />
								<span className={styles.levelName}>Senior</span>
								<span className={styles.levelDesc}>{t('progress.senior')}</span>
							</div>
						</Reveal>
					</div>
				</section>

				<section className={styles.section}>
					<Reveal className={styles.sectionHead}>
						<Eyebrow>{t('hist.eyebrow')}</Eyebrow>
						<h2 className={styles.sectionH2}>{t('hist.h2')}</h2>
						<p className={styles.sectionP}>{t('hist.p')}</p>
					</Reveal>

					<Reveal style={{ overflowX: 'auto' }}>
						<table className={styles.historyTable}>
							<thead>
								<tr>
									<th>{t('hist.colTopic')}</th>
									<th>{t('hist.colLevel')}</th>
									<th>{t('hist.colDate')}</th>
									<th>{t('hist.colScore')}</th>
									<th>{t('hist.colStatus')}</th>
								</tr>
							</thead>
							<tbody>
								{DEMO_HISTORY.map((row) => (
									<tr key={row.date}>
										<td data-label={t('hist.colTopic')} className={styles.topicCell}>
											{TOPIC_LABEL[row.topic]}
										</td>
										<td data-label={t('hist.colLevel')}>{LEVEL_LABEL[row.level]}</td>
										<td data-label={t('hist.colDate')}>{row.date}</td>
										<td data-label={t('hist.colScore')} className={styles.scoreCell}>
											{row.score}
										</td>
										<td data-label={t('hist.colStatus')}>
											<span
												className={[styles.statusBadge, row.pass ? styles.pass : styles.retry].join(
													' ',
												)}
											>
												{row.pass ? t('hist.pass') : t('hist.retry')}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</Reveal>
				</section>

				<section className={[styles.section, styles.ctaBand].join(' ')} id="cta">
					<Eyebrow centered>{t('cta.eyebrow')}</Eyebrow>
					<h2 className={styles.ctaH2}>{t('cta.h2')}</h2>
					<p className={styles.ctaP}>{t('cta.p')}</p>
					<div className={[styles.heroCta, styles.ctaButtons].join(' ')}>
						<Link to="/login" className={buttonClassName({ variant: 'primary', size: 'lg' })}>
							{t('cta.btn')}
						</Link>
					</div>
					<p className={styles.finePrint}>{t('cta.fine')}</p>
				</section>
			</main>

			<footer className={styles.footer}>
				<div className={styles.footerInner}>
					<span className={styles.footerTag}>{t('footer.tag')}</span>
					<ul className={styles.footerLinks}>
						{NAV_LINKS.filter((l) => l.key !== 'nav.review').map((link) => (
							<li key={link.anchor}>
								<a href={link.anchor}>{t(link.key)}</a>
							</li>
						))}
					</ul>
				</div>
			</footer>
		</div>
	);
}
