import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthAmbientBackdrop, Button, Eyebrow, PasswordField, TextField } from '../components';
import loginStyles from './LoginPage.module.css';
import styles from './ResetPasswordPage.module.css';

const FAKE_DELAY_MS = 700;

type RequestStep = 'form' | 'sent';
type ResetStep = 'form' | 'done';

function RequestEmailView() {
	const [step, setStep] = useState<RequestStep>('form');
	const [email, setEmail] = useState('');
	const [pending, setPending] = useState(false);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		setPending(true);
		setTimeout(() => {
			setPending(false);
			setStep('sent');
		}, FAKE_DELAY_MS);
	}

	if (step === 'sent') {
		return (
			<>
				<Eyebrow centered>$ diff --forgot-password</Eyebrow>
				<h1 className={loginStyles.h1}>Перевір пошту</h1>
				<p className={loginStyles.subtitle}>
					Якщо акаунт з адресою <b>{email}</b> існує, ми надіслали лінк для відновлення пароля.
				</p>
				<Link to="/login" className={styles.backLink}>
					← Повернутися до входу
				</Link>
			</>
		);
	}

	return (
		<>
			<Eyebrow centered>$ diff --forgot-password</Eyebrow>
			<h1 className={loginStyles.h1}>Забули пароль?</h1>
			<p className={loginStyles.subtitle}>Введи email — надішлемо лінк для відновлення.</p>

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
					{pending ? 'Надсилаємо…' : 'Надіслати лінк'}
				</Button>
			</form>

			<p className={loginStyles.switchLine}>
				Згадав(-ла) пароль? <Link to="/login" className={loginStyles.switchLink}>Увійти</Link>
			</p>
		</>
	);
}

function NewPasswordView() {
	const [step, setStep] = useState<ResetStep>('form');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (password !== confirmPassword) {
			setError('Паролі не збігаються');
			return;
		}
		setError(null);
		setPending(true);
		setTimeout(() => {
			setPending(false);
			setStep('done');
		}, FAKE_DELAY_MS);
	}

	if (step === 'done') {
		return (
			<>
				<Eyebrow centered>$ diff --reset-password</Eyebrow>
				<h1 className={loginStyles.h1}>Пароль змінено</h1>
				<p className={loginStyles.subtitle}>Тепер можеш увійти з новим паролем.</p>
				<Link to="/login">
					<Button type="button" variant="primary" size="lg">
						Увійти
					</Button>
				</Link>
			</>
		);
	}

	return (
		<>
			<Eyebrow centered>$ diff --reset-password</Eyebrow>
			<h1 className={loginStyles.h1}>Новий пароль</h1>
			<p className={loginStyles.subtitle}>Введи новий пароль для свого акаунта.</p>

			<form className={loginStyles.form} onSubmit={handleSubmit}>
				<PasswordField
					label="Новий пароль"
					placeholder="мінімум 8 символів"
					autoComplete="new-password"
					required
					minLength={8}
					hint="Мінімум 8 символів"
					value={password}
					onChange={setPassword}
				/>
				<PasswordField
					label="Підтвердь пароль"
					placeholder="••••••••"
					autoComplete="new-password"
					required
					minLength={8}
					value={confirmPassword}
					onChange={setConfirmPassword}
				/>
				<Button type="submit" variant="primary" size="lg" disabled={pending}>
					{pending ? 'Зберігаємо…' : 'Змінити пароль'}
				</Button>
			</form>

			{error && <p className={loginStyles.error}>{error}</p>}
		</>
	);
}

export function ResetPasswordPage() {
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

			<p className={loginStyles.authFooter}>diff — порівняй. виправ. пройди.</p>
		</div>
	);
}
