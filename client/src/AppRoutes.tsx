import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { RequireAuth } from './RequireAuth';
import { InterviewSessionPage } from './pages/InterviewSessionPage';
import { NewSessionPage } from './pages/NewSessionPage';

export function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/interview/new" replace />} />
			<Route
				path="/interview/new"
				element={
					<RequireAuth>
						<NewSessionPage />
					</RequireAuth>
				}
			/>
			<Route
				path="/interview/:sessionId"
				element={
					<RequireAuth>
						<InterviewSessionPage />
					</RequireAuth>
				}
			/>
			<Route path="/showcase" element={<App />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
