import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthAmbientBackdrop, Button, Eyebrow, PasswordField, TextField } from '../components';
import { ApiError } from '../api/client';
import { useRequestPasswordReset } from '../hooks/useAuth';
import { useFakeSubmit } from '../hooks/useFakeSubmit';
import loginStyles from './LoginPage.module.css';
import styles from './ResetPasswordPage.module.css';

type RequestStep = 'form' | 'sent' | 'google';
type ResetStep = 'form' | 'done';

function RequestEmailView() {
	const { t } = useTranslation();
	const [step, setStep] = useState<RequestStep>('form');
	const [email, setEmail] = useState('');
	const [error, setError] = useState<string | null>(null);
	const { mutate, isPending: pending } = useRequestPasswordReset();

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		setError(null);
		mutate(email, {
			onSuccess: (data) => setStep(data.hint === 'google_account' ? 'google' : 'sent'),
			onError: (err) => setError(err instanceof ApiError && err.status === 429 ? t('reset.rateLimited') : t('reset.requestError')),
		});
	}

	if (step === 'google') {
		return (
			<>
				<Eyebrow centered>$ diff --forgot-password</Eyebrow>
				<h1 className={loginStyles.h1}>{t('reset.googleTitle')}</h1>
				<p className={loginStyles.subtitle}>{t('reset.googleBody')}</p>
				<Link to="/login" className={styles.backLink}>
					{t('reset.googleCta')}
				</Link>
			</>
		);
	}

	if (step === 'sent') {
		return (
			<>
				<Eyebrow centered>$ diff --forgot-password</Eyebrow>
				<h1 className={loginStyles.h1}>{t('reset.checkTitle')}</h1>
				<p className={loginStyles.subtitle}>
					<Trans i18nKey="reset.checkBody" values={{ email }} components={{ b: <b /> }} />
				</p>
				<Link to="/login" className={styles.backLink}>
					{t('reset.back')}
				</Link>
			</>
		);
	}

	return (
		<>
			<Eyebrow centered>$ diff --forgot-password</Eyebrow>
			<h1 className={loginStyles.h1}>{t('reset.forgotTitle')}</h1>
			<p className={loginStyles.subtitle}>{t('reset.forgotSubtitle')}</p>

			<form className={loginStyles.form} onSubmit={handleSubmit}>
				<TextField
					label="Email"
					type="email"
					placeholder="tanya@example.com"
					required
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				<Button type="submit" variant="primary" size="lg" disabled={pending}>
					{pending ? t('reset.sending') : t('reset.send')}
				</Button>
			</form>

			{error && <p className={loginStyles.error}>{error}</p>}

			<p className={loginStyles.switchLine}>
				{t('reset.remembered')}{' '}
				<Link to="/login" className={loginStyles.switchLink}>
					{t('auth.signIn')}
				</Link>
			</p>
		</>
	);
}

function NewPasswordView() {
	const { t } = useTranslation();
	const [step, setStep] = useState<ResetStep>('form');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const { pending, run } = useFakeSubmit();
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (password !== confirmPassword) {
			setError(t('reset.mismatch'));
			return;
		}
		setError(null);
		run(() => setStep('done'));
	}

	if (step === 'done') {
		return (
			<>
				<Eyebrow centered>$ diff --reset-password</Eyebrow>
				<h1 className={loginStyles.h1}>{t('reset.doneTitle')}</h1>
				<p className={loginStyles.subtitle}>{t('reset.doneBody')}</p>
				<Link to="/login">
					<Button type="button" variant="primary" size="lg">
						{t('auth.signIn')}
					</Button>
				</Link>
			</>
		);
	}

	return (
		<>
			<Eyebrow centered>$ diff --reset-password</Eyebrow>
			<h1 className={loginStyles.h1}>{t('reset.newTitle')}</h1>
			<p className={loginStyles.subtitle}>{t('reset.newSubtitle')}</p>

			<form className={loginStyles.form} onSubmit={handleSubmit}>
				<PasswordField
					label={t('reset.newLabel')}
					placeholder={t('auth.passwordPlaceholder')}
					autoComplete="new-password"
					required
					minLength={8}
					hint={t('auth.passwordHint')}
					value={password}
					onChange={setPassword}
				/>
				<PasswordField
					label={t('reset.confirmLabel')}
					placeholder="••••••••"
					autoComplete="new-password"
					required
					minLength={8}
					value={confirmPassword}
					onChange={setConfirmPassword}
				/>
				<Button type="submit" variant="primary" size="lg" disabled={pending}>
					{pending ? t('reset.saving') : t('reset.save')}
				</Button>
			</form>

			{error && <p className={loginStyles.error}>{error}</p>}
		</>
	);
}

export function ResetPasswordPage() {
	const { t } = useTranslation();
	const [searchParams] = useSearchParams();
	const hasToken = Boolean(searchParams.get('token'));

	return (
		<div className={loginStyles.page}>
			<AuthAmbientBackdrop />

			<main className={loginStyles.authMain}>
				<div className={loginStyles.authCard}>
					{hasToken ? <NewPasswordView /> : <RequestEmailView />}
				</div>
			</main>

			<p className={loginStyles.authFooter}>{t('common.tagline')}</p>
		</div>
	);
}
