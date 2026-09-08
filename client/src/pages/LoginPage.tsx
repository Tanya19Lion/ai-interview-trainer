import { useCallback, useState } from 'react';
import type { SubmitEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
	Button,
	CodeDiffLine,
	EditorComment,
	EditorWindow,
	Eyebrow,
	LevelChip,
	PasswordField,
	ScoreChip,
	Tabs,
	TextField,
} from '../components';
import { useGoogleLogin, useLoginWithPassword, useRegister } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

type Mode = 'signin' | 'signup';

const SUBTITLE: Record<Mode, string> = {
	signin: 'Введи email і пароль — або обери Google, це швидше.',
	signup: 'Створи акаунт за хвилину — або зареєструйся через Google, ще швидше.',
};

const SWITCH_LINE: Record<Mode, { question: string; action: string; target: Mode }> = {
	signin: { question: 'Ще немає акаунта?', action: 'Зареєструватися', target: 'signup' },
	signup: { question: 'Вже є акаунт?', action: 'Увійти', target: 'signin' },
};

export function LoginPage() {
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
			<div className={styles.topbar}>
				<Link to="/" className={styles.logo}>
					diff<span className={styles.cursor} aria-hidden="true" />
				</Link>
			</div>

			<EditorWindow
				className={styles.ambientWrap}
				title={
					<>
						<b>session_04</b> · react/middle/answer.md
					</>
				}
				footer={
					<>
						<ScoreChip tone="mid">Точність: 6/10</ScoreChip>
						<LevelChip>Middle · React</LevelChip>
					</>
				}
			>
				<CodeDiffLine gutter="12" variant="question">
					// Q: Чим useMemo відрізняється від useCallback?
				</CodeDiffLine>
				<CodeDiffLine gutter="13" variant="removed">
					useMemo кешує функцію, а useCallback кешує значення.
				</CodeDiffLine>
				<CodeDiffLine gutter="13" variant="added">
					useMemo кешує значення (результат обчислення), а useCallback — саму функцію, щоб вона не
					створювалась заново.
				</CodeDiffLine>
				<EditorComment>Поширена плутанина. Memo → значення, Callback → сама функція.</EditorComment>
			</EditorWindow>

			<main className={styles.authMain}>
				<div className={styles.authCard}>
					<Eyebrow centered>$ diff --login</Eyebrow>
					<h1 className={styles.h1}>Один акаунт. Уся історія твоїх співбесід.</h1>
					<p className={styles.subtitle}>{SUBTITLE[mode]}</p>

					<div className={styles.tabsRow}>
						<Tabs
							value={mode}
							onChange={(value) => setMode(value as Mode)}
							items={[
								{ value: 'signin', label: 'Увійти' },
								{ value: 'signup', label: 'Зареєструватися' },
							]}
						/>
					</div>

					<div className={styles.googleWrap}>
						<GoogleLogin
							theme="filled_black"
							size="large"
							width="320"
							text="continue_with"
							onSuccess={handleGoogleSuccess}
						/>
					</div>

					<p className={styles.scopeNote}># доступ лише до email та імені — жодного Gmail чи Диску</p>

					<div className={styles.divider}>
						<span>або</span>
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
								label="Пароль"
								labelExtra={
									<a href="#" className={styles.forgotLink}>
										Забули пароль?
									</a>
								}
								placeholder="••••••••"
								autoComplete="current-password"
								required
								value={signinPassword}
								onChange={setSigninPassword}
							/>
							<Button type="submit" variant="primary" size="lg" disabled={login.isPending}>
								{login.isPending ? 'Входимо…' : 'Увійти'}
							</Button>
						</form>
					) : (
						<form className={styles.form} onSubmit={handleSignup}>
							<TextField
								label="Ім'я"
								placeholder="Таня"
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
								label="Пароль"
								placeholder="мінімум 8 символів"
								autoComplete="new-password"
								required
								minLength={8}
								hint="Мінімум 8 символів"
								value={signupPassword}
								onChange={setSignupPassword}
							/>
							<Button type="submit" variant="primary" size="lg" disabled={register.isPending}>
								{register.isPending ? 'Створюємо акаунт…' : 'Створити акаунт'}
							</Button>
						</form>
					)}

					{pendingError && <p className={styles.error}>{pendingError.message}</p>}

					<p className={styles.switchLine}>
						{switchLine.question}{' '}
						<button
							type="button"
							className={styles.switchLink}
							onClick={() => setMode(switchLine.target)}
						>
							{switchLine.action}
						</button>
					</p>

					<p className={styles.finePrint}>
						Продовжуючи, ти погоджуєшся з <a href="#">Умовами використання</a> та{' '}
						<a href="#">Політикою конфіденційності</a> diff.
					</p>
				</div>
			</main>

			<p className={styles.authFooter}>diff — порівняй. виправ. пройди.</p>
		</div>
	);
}
