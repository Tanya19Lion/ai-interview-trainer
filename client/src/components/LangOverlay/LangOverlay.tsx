import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LangOverlay.module.css';

const STORAGE_KEY = 'diff-lang-chosen';

export function LangOverlay() {
	const { i18n, t } = useTranslation();
	const [visible, setVisible] = useState(false);
	const [leaving, setLeaving] = useState(false);

	useEffect(() => {
		if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
	}, []);

	if (!visible) return null;

	function choose(lang: 'uk' | 'en') {
		i18n.changeLanguage(lang);
		localStorage.setItem(STORAGE_KEY, lang);
		setLeaving(true);
		setTimeout(() => setVisible(false), 250);
	}

	return (
		<div
			className={[styles.overlay, leaving ? styles.leaving : null].filter(Boolean).join(' ')}
			role="dialog"
			aria-modal="true"
			aria-label="Language selection / Вибір мови"
		>
			<div className={styles.card}>
				<span className={styles.eyebrow}>{t('lang.eyebrow')}</span>
				<p className={styles.question}>{t('lang.q')}</p>
				<p className={styles.questionSub}>{t('lang.qSub')}</p>
				<div className={styles.options}>
					<button type="button" className={styles.langBtn} onClick={() => choose('uk')}>
						{t('lang.uk')}
					</button>
					<button type="button" className={styles.langBtn} onClick={() => choose('en')}>
						{t('lang.en')}
					</button>
				</div>
			</div>
		</div>
	);
}
