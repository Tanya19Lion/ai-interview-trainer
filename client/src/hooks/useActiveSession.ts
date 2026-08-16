import { useQuery } from '@tanstack/react-query';
import { getActiveSession } from '../api/interview';

export function useActiveSession(enabled = true) {
	return useQuery({ queryKey: ['activeSession'], queryFn: getActiveSession, enabled });
}
