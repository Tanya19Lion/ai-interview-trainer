import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthAmbientBackdrop, Eyebrow } from '../components';
import loginStyles from './LoginPage.module.css';
import legalStyles from './LegalPage.module.css';
import styles from './ResetPasswordPage.module.css';

const SECTION_COUNT = 10;

export function TermsPage() {
	const { t } = useTranslation();

	return (
		<div className={loginStyles.page}>
			<AuthAmbientBackdrop />

			<main className={loginStyles.authMain}>
				<div className={legalStyles.card}>
					<Eyebrow>$ diff --terms</Eyebrow>
					<h1 className={loginStyles.h1}>{t('terms.title')}</h1>
					<p className={legalStyles.intro}>{t('terms.updated')}</p>
					<p className={legalStyles.intro}>{t('terms.intro')}</p>

					{Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
						<section key={n} className={legalStyles.section}>
							<h2 className={legalStyles.sectionHeading}>{t(`terms.s${n}Heading`)}</h2>
							<p className={legalStyles.sectionBody}>{t(`terms.s${n}Body`)}</p>
						</section>
					))}

					<Link to="/login" className={styles.backLink}>
						{t('terms.back')}
					</Link>
				</div>
			</main>

			<p className={loginStyles.authFooter}>{t('common.tagline')}</p>
		</div>
	);
}
