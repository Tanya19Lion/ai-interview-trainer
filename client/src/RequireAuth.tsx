import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from './components';
import { useMe } from './hooks/useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
	const me = useMe();
	const location = useLocation();

	if (me.isLoading) {
		return <Spinner aria-label="Перевірка сесії…" />;
	}

	if (me.isError) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <>{children}</>;
}