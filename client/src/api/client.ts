const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', ...init?.headers },
		...init,
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => ({}))) as { error?: string };
		throw new ApiError(body.error ?? res.statusText, res.status);
	}
	return res.json() as Promise<T>;
}
