import { apiFetch } from './client';
import type { StatsResponse } from '../types/stats';

export function getStats(): Promise<StatsResponse> {
	return apiFetch('/stats');
}
