import { apiFetch } from './client';
import type {
	ActiveSessionResponse,
	HistoryFilters,
	HistoryResponse,
	InterviewSessionDetail,
	StartSessionRequest,
	StartSessionResponse,
	SubmitAnswerRequest,
	SubmitAnswerResponse,
} from '../types/interview';

export function startInterviewSession(body: StartSessionRequest): Promise<StartSessionResponse> {
	return apiFetch('/interview/start', { method: 'POST', body: JSON.stringify(body) });
}

export function submitInterviewAnswer(
	sessionId: string,
	body: SubmitAnswerRequest,
): Promise<SubmitAnswerResponse> {
	return apiFetch(`/interview/${sessionId}/answer`, { method: 'POST', body: JSON.stringify(body) });
}

export async function getActiveSession(): Promise<ActiveSessionResponse | null> {
	const session = await apiFetch<ActiveSessionResponse | undefined>('/interview/active');
	return session ?? null;
}

export function getSessionDetail(id: string): Promise<InterviewSessionDetail> {
	return apiFetch(`/history/${id}`);
}

export function getHistory(filters: HistoryFilters = {}): Promise<HistoryResponse> {
	const params = new URLSearchParams();
	if (filters.topic) params.set('topic', filters.topic);
	if (filters.level) params.set('level', filters.level);
	const query = params.toString();
	return apiFetch(`/history${query ? `?${query}` : ''}`);
}
