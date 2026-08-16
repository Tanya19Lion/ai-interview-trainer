import { useQuery } from '@tanstack/react-query';
import { getHistory } from '../api/interview';
import type { HistoryFilters } from '../types/interview';

export function useHistory(filters: HistoryFilters = {}) {
	return useQuery({
		queryKey: ['history', filters],
		queryFn: () => getHistory(filters),
	});
}
