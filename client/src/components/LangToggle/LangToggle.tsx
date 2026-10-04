import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../i18n';
import { buttonClassName } from '../Button/buttonClassName';
import styles from './LangToggle.module.css';

/** Перемикач UK/EN: показує код мови, на яку перемкне (як ThemeToggle показує дію, а не стан). */
export function LangToggle() {
	const { t, i18n } = useTranslation();
	const next = i18n.language === 'en' ? 'uk' : 'en';

	return (
		<button
			type="button"
			className={buttonClassName({ variant: 'ghost', size: 'md', className: styles.toggle })}
			onClick={() => setLanguage(next)}
			aria-label={t('lang.switchAria', { lang: t(`lang.${next}`) })}
		>
			{next.toUpperCase()}
		</button>
	);
}
