const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
	status: number;
	code?: string;

	constructor(message: string, status: number, code?: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', ...init?.headers },
		...init,
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string; code?: string };
		throw new ApiError(body.message ?? body.error ?? res.statusText, res.status, body.code);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}
