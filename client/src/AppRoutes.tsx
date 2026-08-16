import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { ProtectedLayout } from './ProtectedLayout';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { InterviewSessionPage } from './pages/InterviewSessionPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NewSessionPage } from './pages/NewSessionPage';
import { ProgressPage } from './pages/ProgressPage';

export function AppRoutes() {
	return (
		<Routes>
			<Route path="/welcome" element={<LandingPage />} />
			<Route path="/login" element={<LoginPage />} />
			<Route element={<ProtectedLayout />}>
				<Route path="/" element={<HomePage />} />
				<Route path="/interview/new" element={<NewSessionPage />} />
				<Route path="/interview/:sessionId" element={<InterviewSessionPage />} />
				<Route path="/history" element={<HistoryPage />} />
				<Route path="/progress" element={<ProgressPage />} />
			</Route>
			<Route path="/showcase" element={<App />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}