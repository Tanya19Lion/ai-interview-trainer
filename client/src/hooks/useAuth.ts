import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { devLogin, fetchMe } from '../api/auth';

export function useMe() {
	return useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });
}

/** TEMPORARY — доки не підключено реальний Google OAuth на клієнті. */
export function useDevLogin() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ email, name }: { email: string; name?: string }) => devLogin(email, name),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
	});
}
