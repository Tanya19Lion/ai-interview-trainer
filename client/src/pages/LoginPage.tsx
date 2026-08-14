import { useCallback, useState } from 'react';
import type { SubmitEvent } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useLocation, useNavigate } from 'react-router-dom';
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
	signin: 'Продовж прокачувати навички технічних співбесід.',
	signup: 'Створи акаунт і почни проходити співбесіди у форматі code review.',
};

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

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
			<div className={styles.card}>
				<Eyebrow>$ diff --login</Eyebrow>
				<h1 className={styles.h1}>Увійди в diff</h1>
				<p className={styles.subtitle}>{SUBTITLE[mode]}</p>

				<div className={styles.googleWrap}>
					<GoogleLogin
						theme="filled_black"
						size="large"
						width="320"
						text={mode === 'signin' ? 'signin_with' : 'signup_with'}
						onSuccess={handleGoogleSuccess}
					/>
				</div>

				<div className={styles.divider}>
					<span>або</span>
				</div>

				<Tabs
					value={mode}
					onChange={(value) => setMode(value as Mode)}
					items={[
						{ value: 'signin', label: 'Увійти' },
						{ value: 'signup', label: 'Зареєструватися' },
					]}
				/>

				{mode === 'signin' ? (
					<form className={styles.form} onSubmit={handleSignin}>
						<TextField
							label="Email"
							type="email"
							required
							autoComplete="email"
							value={signinEmail}
							onChange={(event) => setSigninEmail(event.target.value)}
						/>
						<PasswordField
							label="Пароль"
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
							required
							autoComplete="name"
							value={signupName}
							onChange={(event) => setSignupName(event.target.value)}
						/>
						<TextField
							label="Email"
							type="email"
							required
							autoComplete="email"
							value={signupEmail}
							onChange={(event) => setSignupEmail(event.target.value)}
						/>
						<PasswordField
							label="Пароль"
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
					{mode === 'signin' ? (
						<>
							Немає акаунта?{' '}
							<button type="button" className={styles.switchLink} onClick={() => setMode('signup')}>
								Зареєструйся
							</button>
						</>
					) : (
						<>
							Вже є акаунт?{' '}
							<button type="button" className={styles.switchLink} onClick={() => setMode('signin')}>
								Увійди
							</button>
						</>
					)}
				</p>
			</div>

			<EditorWindow
				className={styles.ambient}
				title={
					<>
						<b>welcome</b> · getting-started.md
					</>
				}
				footer={
					<>
						<ScoreChip tone="good">Прогрес: 0/10 співбесід</ScoreChip>
						<LevelChip>Junior · React</LevelChip>
					</>
				}
			>
				<CodeDiffLine gutter="1" variant="removed">
					Читав документацію, але не практикувався
				</CodeDiffLine>
				<CodeDiffLine gutter="2" variant="added">
					Проходь технічні співбесіди у форматі code review
				</CodeDiffLine>
				<EditorComment>
					Кожна відповідь — це diff: що було не так і як покращити.
				</EditorComment>
			</EditorWindow>
		</div>
	);
}