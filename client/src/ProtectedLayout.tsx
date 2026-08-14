import { useState } from 'react';
import { RequireAuth } from './RequireAuth';
import { AppShell } from './components';
import { InterviewFocusContext, type InterviewFocusState } from './lib/interviewFocus';

/** Спільний layout для захищених маршрутів: гейт автентифікації + AppShell (nav/focus-bar + Outlet). */
export function ProtectedLayout() {
	const [focus, setFocus] = useState<InterviewFocusState | null>(null);

	return (
		<RequireAuth>
			<InterviewFocusContext.Provider value={{ focus, setFocus }}>
				<AppShell focus={focus} />
			</InterviewFocusContext.Provider>
		</RequireAuth>
	);
}