import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import './index.css';
import i18n from './i18n';
import { AppRoutes } from './AppRoutes';
import { ThemeProvider } from './context/theme/ThemeProvider';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider>
			<I18nextProvider i18n={i18n}>
				<QueryClientProvider client={queryClient}>
					<BrowserRouter>
						<AppRoutes />
					</BrowserRouter>
				</QueryClientProvider>
			</I18nextProvider>
		</ThemeProvider>
	</StrictMode>,
);
