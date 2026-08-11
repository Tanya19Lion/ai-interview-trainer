import { useState } from 'react';
import type { ReactNode, SubmitEvent } from 'react';
import { Button, Spinner } from './components';
import { useDevLogin, useMe } from './hooks/useAuth';

/** TEMPORARY guard — dev-login форма замінить себе на реальний Google Sign-In, коли той буде підключений. */
export function RequireAuth({ children }: { children: ReactNode }) {
	const me = useMe();
	const devLogin = useDevLogin();
	const [email, setEmail] = useState('');

	if (me.isLoading) {
		return <Spinner aria-label="Перевірка сесії…" />;
	}

	if (me.isError) {
		function handleSubmit(event: SubmitEvent) {
			event.preventDefault();
			if (email.trim()) devLogin.mutate({ email: email.trim() });
		}

		return (
			<form
				onSubmit={handleSubmit}
				style={{ display: 'grid', gap: 'var(--space-2)', maxWidth: 360 }}
			>
				<p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>
					Тимчасовий dev-логін (Google Sign-In ще не підключено): введи email.
				</p>
				<input
					type="email"
					required
					placeholder="you@example.com"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					style={{
						padding: '0.62rem 0.9rem',
						borderRadius: 'var(--radius-s)',
						border: '1px solid var(--line)',
						background: 'var(--ink-2)',
						color: 'var(--off-white)',
					}}
				/>
				<Button type="submit" disabled={devLogin.isPending}>
					{devLogin.isPending ? <Spinner variant="on-primary" /> : 'Увійти'}
				</Button>
			</form>
		);
	}

	return <>{children}</>;
}
