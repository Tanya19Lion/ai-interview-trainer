import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	fetchMe,
	googleLogin,
	loginWithPassword,
	logout,
	registerWithPassword,
} from '../api/auth';

export function useMe() {
	return useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });
}

export function useGoogleLogin() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (idToken: string) => googleLogin(idToken),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
	});
}

export function useRegister() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: registerWithPassword,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
	});
}

export function useLoginWithPassword() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: loginWithPassword,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
	});
}

export function useLogout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: logout,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
	});
}