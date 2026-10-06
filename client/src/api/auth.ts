import { apiFetch } from './client';

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	avatarUrl?: string;
}

export function fetchMe(): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/me');
}

export function googleLogin(
	idToken: string,
	rememberMe?: boolean
): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ idToken, rememberMe }) });
}

export function registerWithPassword(body: {
	email: string;
	password: string;
	name: string;
	rememberMe?: boolean;
}): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

export function loginWithPassword(body: {
	email: string;
	password: string;
	rememberMe?: boolean;
}): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export interface RequestPasswordResetResponse {
	message: string;
	hint?: 'google_account' | null;
	attemptsRemaining?: number;
}

export function requestPasswordReset(email: string): Promise<RequestPasswordResetResponse> {
	return apiFetch('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
}

export function refreshSession(): Promise<void> {
	return apiFetch('/auth/refresh', { method: 'POST' });
}

export function logout(): Promise<{ ok: boolean }> {
	return apiFetch('/auth/logout', { method: 'POST' });
}