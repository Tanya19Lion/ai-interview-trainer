import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANG_STORAGE_KEY, LANGS, setLanguage, type Lang } from '../../i18n';
import styles from './LangOverlay.module.css';

export function LangOverlay() {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);
	const [leaving, setLeaving] = useState(false);

	useEffect(() => {
		try {
			if (!localStorage.getItem(LANG_STORAGE_KEY)) setVisible(true);
		} catch {
			setVisible(true);
		}
	}, []);

	if (!visible) return null;

	function choose(lang: Lang) {
		setLanguage(lang);
		setLeaving(true);
		setTimeout(() => setVisible(false), 250);
	}

	return (
		<div
			className={[styles.overlay, leaving ? styles.leaving : null].filter(Boolean).join(' ')}
			role="dialog"
			aria-modal="true"
			aria-label={t('lang.overlayAria')}
		>
			<div className={styles.card}>
				<span className={styles.eyebrow}>{t('lang.eyebrow')}</span>
				<p className={styles.question}>{t('lang.q')}</p>
				<p className={styles.questionSub}>{t('lang.qSub')}</p>
				<div className={styles.options}>
					{LANGS.map((lang) => (
						<button key={lang} type="button" className={styles.langBtn} onClick={() => choose(lang)}>
							{t(`lang.${lang}`)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
