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

export function googleLogin(idToken: string): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) });
}

export function registerWithPassword(body: {
	email: string;
	password: string;
	name: string;
}): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

export function loginWithPassword(body: {
	email: string;
	password: string;
}): Promise<{ user: AuthUser }> {
	return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export function logout(): Promise<{ ok: boolean }> {
	return apiFetch('/auth/logout', { method: 'POST' });
}