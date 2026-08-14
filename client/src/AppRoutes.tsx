import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { ProtectedLayout } from './ProtectedLayout';
import { InterviewSessionPage } from './pages/InterviewSessionPage';
import { LoginPage } from './pages/LoginPage';
import { NewSessionPage } from './pages/NewSessionPage';

export function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/interview/new" replace />} />
			<Route path="/login" element={<LoginPage />} />
			<Route element={<ProtectedLayout />}>
				<Route path="/interview/new" element={<NewSessionPage />} />
				<Route path="/interview/:sessionId" element={<InterviewSessionPage />} />
			</Route>
			<Route path="/showcase" element={<App />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}