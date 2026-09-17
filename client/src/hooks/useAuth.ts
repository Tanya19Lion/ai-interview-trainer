import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	fetchMe,
	googleLogin,
	loginWithPassword,
	logout,
	refreshSession,
	registerWithPassword,
} from '../api/auth';

export function useMe() {
	return useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });
}

// Interval is deliberately independent of the server's JWT_EXPIRES_IN (see T9 story) — it only
// needs to stay safely shorter than any realistic access-token lifetime, not match it exactly.
export const RENEWAL_INTERVAL_MS = 4 * 60 * 1000;

export function useTokenRenewal(enabled: boolean) {
	const queryClient = useQueryClient();
	return useQuery({
		queryKey: ['token-renewal'],
		queryFn: () =>
			refreshSession()
				.then(() => true)
				.catch((error: unknown) => {
					queryClient.invalidateQueries({ queryKey: ['me'] });
					throw error;
				}),
		enabled,
		refetchInterval: RENEWAL_INTERVAL_MS,
		retry: false,
	});
}

export function useGoogleLogin() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (idToken: string) => googleLogin(idToken),
		onSuccess: (data) => queryClient.setQueryData(['me'], data),
	});
}

export function useRegister() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: registerWithPassword,
		onSuccess: (data) => queryClient.setQueryData(['me'], data),
	});
}

export function useLoginWithPassword() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: loginWithPassword,
		onSuccess: (data) => queryClient.setQueryData(['me'], data),
	});
}

export function useLogout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: logout,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
	});
}