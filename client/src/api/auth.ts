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

/** TEMPORARY — заглушка для розробки, доки не підключено реальний Google OAuth на клієнті. */
export function devLogin(email: string, name?: string): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/dev-login', { method: 'POST', body: JSON.stringify({ email, name }) });
}
