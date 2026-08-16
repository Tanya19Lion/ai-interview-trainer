import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import './index.css';
import i18n from './i18n';
import { AppRoutes } from './AppRoutes';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<I18nextProvider i18n={i18n}>
			<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
				<QueryClientProvider client={queryClient}>
					<BrowserRouter>
						<AppRoutes />
					</BrowserRouter>
				</QueryClientProvider>
			</GoogleOAuthProvider>
		</I18nextProvider>
	</StrictMode>,
);
