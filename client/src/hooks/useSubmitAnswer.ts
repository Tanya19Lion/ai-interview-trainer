import { useMutation } from '@tanstack/react-query';
import { submitInterviewAnswer } from '../api/interview';
import type { SubmitAnswerRequest } from '../types/interview';

export function useSubmitAnswer(sessionId: string) {
	return useMutation({
		mutationFn: (body: SubmitAnswerRequest) => submitInterviewAnswer(sessionId, body),
	});
}
