import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthAmbientBackdrop, Eyebrow } from '../components';
import loginStyles from './LoginPage.module.css';
import styles from './ResetPasswordPage.module.css';

export function TermsPage() {
	const { t } = useTranslation();

	return (
		<div className={loginStyles.page}>
			<AuthAmbientBackdrop />

			<main className={loginStyles.authMain}>
				<div className={loginStyles.authCard}>
					<Eyebrow centered>$ diff --terms</Eyebrow>
					<h1 className={loginStyles.h1}>{t('terms.title')}</h1>
					<p className={loginStyles.subtitle}>{t('terms.updated')}</p>

					<p className={loginStyles.subtitle}>{t('terms.body1')}</p>
					<p className={loginStyles.subtitle}>{t('terms.body2')}</p>
					<p className={loginStyles.subtitle}>{t('terms.body3')}</p>
					<p className={loginStyles.subtitle}>{t('terms.body4')}</p>
					<p className={loginStyles.subtitle}>{t('terms.body5')}</p>

					<Link to="/login" className={styles.backLink}>
						{t('terms.back')}
					</Link>
				</div>
			</main>

			<p className={loginStyles.authFooter}>{t('common.tagline')}</p>
		</div>
	);
}
