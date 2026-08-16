import { useQuery } from '@tanstack/react-query';
import { getSessionDetail } from '../api/interview';

export function useSessionDetail(id: string | null) {
	return useQuery({
		queryKey: ['sessionDetail', id],
		queryFn: () => getSessionDetail(id as string),
		enabled: id !== null,
	});
}
