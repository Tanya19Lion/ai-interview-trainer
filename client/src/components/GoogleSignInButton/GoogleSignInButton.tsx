import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { currentLang } from '../../i18n';

export interface GoogleSignInButtonProps {
	onSuccess: (credentialResponse: CredentialResponse) => void;
}

/** Напис «Продовжити з Google» малює сам Google, а мову бере з `locale` провайдера. Провайдер
 * мемоїзує контекст без `locale` і вантажить скрипт один раз, тож на зміну мови його треба
 * перемонтувати (`key`) — інакше кнопка лишиться мовою браузера/акаунта Google. */
export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
	useTranslation(); // підписка на зміну мови
	const lang = currentLang();

	return (
		<GoogleOAuthProvider key={lang} clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''} locale={lang}>
			<GoogleLogin theme="filled_black" size="large" width="320" text="continue_with" onSuccess={onSuccess} />
		</GoogleOAuthProvider>
	);
}
