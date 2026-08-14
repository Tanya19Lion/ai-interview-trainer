import { createContext, useContext } from 'react';

export interface InterviewFocusState {
	questionIndex: number;
	totalQuestions: number;
	branch: string;
	onExit: () => void;
}

export interface InterviewFocusContextValue {
	focus: InterviewFocusState | null;
	setFocus: (focus: InterviewFocusState | null) => void;
}

export const InterviewFocusContext = createContext<InterviewFocusContextValue | null>(null);

/** Дозволяє InterviewSessionPage повідомити AppShell (спільний layout-предок), що зараз
 * активна співбесіда — той рендерить sticky focus-bar замість звичайної навігації. */
export function useInterviewFocus(): InterviewFocusContextValue {
	const ctx = useContext(InterviewFocusContext);
	if (!ctx) {
		throw new Error('useInterviewFocus must be used within InterviewFocusContext.Provider');
	}
	return ctx;
}