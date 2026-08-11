import { apiFetch } from './client';
import type {
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
