import { useMutation } from '@tanstack/react-query';
import { startInterviewSession } from '../api/interview';

export function useStartSession() {
	return useMutation({ mutationFn: startInterviewSession });
}
