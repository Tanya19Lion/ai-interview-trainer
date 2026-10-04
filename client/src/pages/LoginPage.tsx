import { useCallback, useState } from 'react';
import type { SubmitEvent } from 'react';
import type { CredentialResponse } from '@react-oauth/google';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
	AuthAmbientBackdrop,
	Button,
	Eyebrow,
	GoogleSignInButton,
	PasswordField,
	Tabs,
	TextField,
} from '../components';
import { useGoogleLogin, useLoginWithPassword, useRegister } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

type Mode = 'signin' | 'signup';

const SUBTITLE_KEY = {
	signin: 'login.subtitle.signin',
	signup: 'login.subtitle.signup',
} as const;

const SWITCH_LINE = {
	signin: { questionKey: 'login.switch.signin', actionKey: 'auth.signUp', target: 'signup' },
	signup: { questionKey: 'login.switch.signup', actionKey: 'auth.signIn', target: 'signin' },
} as const;

export function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/home';

	const [mode, setMode] = useState<Mode>('signin');
	const [signinEmail, setSigninEmail] = useState('');
	const [signinPassword, setSigninPassword] = useState('');
	const [signupName, setSignupName] = useState('');
	const [signupEmail, setSignupEmail] = useState('');
	const [signupPassword, setSignupPassword] = useState('');

	const googleLogin = useGoogleLogin();
	const login = useLoginWithPassword();
	const register = useRegister();

	function handleSignin(event: SubmitEvent) {
		event.preventDefault();
		login.mutate(
			{ email: signinEmail, password: signinPassword },
			{ onSuccess: () => navigate(redirectTo, { replace: true }) },
		);
	}

	function handleSignup(event: SubmitEvent) {
		event.preventDefault();
		register.mutate(
			{ email: signupEmail, password: signupPassword, name: signupName },
			{ onSuccess: () => navigate(redirectTo, { replace: true }) },
		);
	}

	const pendingError = mode === 'signin' ? login.error : register.error;
	const switchLine = SWITCH_LINE[mode];

	const handleGoogleSuccess = useCallback(
		(credentialResponse: CredentialResponse) => {
			if (!credentialResponse.credential) return;
			googleLogin.mutate(credentialResponse.credential, {
				onSuccess: () => navigate(redirectTo, { replace: true }),
			});
		},
		[googleLogin, navigate, redirectTo],
	);

	return (
		<div className={styles.page}>
			<AuthAmbientBackdrop />

			<main className={styles.authMain}>
				<div className={styles.authCard}>
					<Eyebrow centered>$ diff --login</Eyebrow>
					<h1 className={styles.h1}>{t('login.h1')}</h1>
					<p className={styles.subtitle}>{t(SUBTITLE_KEY[mode])}</p>

					<div className={styles.tabsRow}>
						<Tabs
							value={mode}
							onChange={(value) => setMode(value as Mode)}
							items={[
								{ value: 'signin', label: t('auth.signIn') },
								{ value: 'signup', label: t('auth.signUp') },
							]}
						/>
					</div>

					<div className={styles.googleWrap}>
						<GoogleSignInButton onSuccess={handleGoogleSuccess} />
					</div>

					<p className={styles.scopeNote}>{t('login.scopeNote')}</p>

					<div className={styles.divider}>
						<span>{t('login.or')}</span>
					</div>

					{mode === 'signin' ? (
						<form className={styles.form} onSubmit={handleSignin}>
							<TextField
								label="Email"
								type="email"
								placeholder="tanya@example.com"
								required
								autoComplete="email"
								value={signinEmail}
								onChange={(event) => setSigninEmail(event.target.value)}
							/>
							<PasswordField
								label={t('auth.password')}
								labelExtra={
									<Link to="/reset-password" className={styles.forgotLink}>
										{t('login.forgot')}
									</Link>
								}
								placeholder="••••••••"
								autoComplete="current-password"
								required
								value={signinPassword}
								onChange={setSigninPassword}
							/>
							<Button type="submit" variant="primary" size="lg" disabled={login.isPending}>
								{login.isPending ? t('login.signingIn') : t('auth.signIn')}
							</Button>
						</form>
					) : (
						<form className={styles.form} onSubmit={handleSignup}>
							<TextField
								label={t('login.name')}
								placeholder={t('login.namePlaceholder')}
								required
								autoComplete="name"
								value={signupName}
								onChange={(event) => setSignupName(event.target.value)}
							/>
							<TextField
								label="Email"
								type="email"
								placeholder="tanya@example.com"
								required
								autoComplete="email"
								value={signupEmail}
								onChange={(event) => setSignupEmail(event.target.value)}
							/>
							<PasswordField
								label={t('auth.password')}
								placeholder={t('auth.passwordPlaceholder')}
								autoComplete="new-password"
								required
								minLength={8}
								hint={t('auth.passwordHint')}
								value={signupPassword}
								onChange={setSignupPassword}
							/>
							<Button type="submit" variant="primary" size="lg" disabled={register.isPending}>
								{register.isPending ? t('login.creating') : t('login.create')}
							</Button>
						</form>
					)}

					{pendingError && <p className={styles.error}>{pendingError.message}</p>}

					<p className={styles.switchLine}>
						{t(switchLine.questionKey)}{' '}
						<button
							type="button"
							className={styles.switchLink}
							onClick={() => setMode(switchLine.target)}
						>
							{t(switchLine.actionKey)}
						</button>
					</p>

					<p className={styles.finePrint}>
						<Trans
							i18nKey="login.terms"
							components={{ terms: <a href="#" />, privacy: <a href="#" /> }}
						/>
					</p>
				</div>
			</main>

			<p className={styles.authFooter}>{t('common.tagline')}</p>
		</div>
	);
}
