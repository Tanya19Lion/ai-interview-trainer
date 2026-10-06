import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthAmbientBackdrop, Eyebrow } from '../components';
import loginStyles from './LoginPage.module.css';
import styles from './ResetPasswordPage.module.css';

export function PrivacyPage() {
	const { t } = useTranslation();

	return (
		<div className={loginStyles.page}>
			<AuthAmbientBackdrop />

			<main className={loginStyles.authMain}>
				<div className={loginStyles.authCard}>
					<Eyebrow centered>$ diff --privacy</Eyebrow>
					<h1 className={loginStyles.h1}>{t('privacy.title')}</h1>
					<p className={loginStyles.subtitle}>{t('privacy.updated')}</p>

					<p className={loginStyles.subtitle}>{t('privacy.body1')}</p>
					<p className={loginStyles.subtitle}>{t('privacy.body2')}</p>
					<p className={loginStyles.subtitle}>{t('privacy.body3')}</p>
					<p className={loginStyles.subtitle}>{t('privacy.body4')}</p>
					<p className={loginStyles.subtitle}>{t('privacy.body5')}</p>

					<Link to="/login" className={styles.backLink}>
						{t('privacy.back')}
					</Link>
				</div>
			</main>

			<p className={loginStyles.authFooter}>{t('common.tagline')}</p>
		</div>
	);
}
