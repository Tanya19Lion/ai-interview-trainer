import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { useTokenRenewal, RENEWAL_INTERVAL_MS } from './useAuth';

vi.mock('../api/auth', () => ({
	refreshSession: vi.fn(),
}));

const { refreshSession } = await import('../api/auth');

function wrapper({ children }: { children: ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTokenRenewal', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(refreshSession).mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls refreshSession again once the renewal interval elapses while enabled', async () => {
		vi.mocked(refreshSession).mockResolvedValue(undefined);

		renderHook(() => useTokenRenewal(true), { wrapper });

		await vi.waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));

		await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS);

		expect(refreshSession).toHaveBeenCalledTimes(2);
	});

	it('never calls refreshSession while disabled', async () => {
		vi.mocked(refreshSession).mockResolvedValue(undefined);

		renderHook(() => useTokenRenewal(false), { wrapper });

		await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS * 2);

		expect(refreshSession).not.toHaveBeenCalled();
	});

	it('does not retry immediately after a 401, waiting for the next interval tick instead', async () => {
		vi.mocked(refreshSession).mockRejectedValue(new ApiError('No refresh token', 401));

		renderHook(() => useTokenRenewal(true), { wrapper });

		await vi.waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));

		await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS - 1000);
		expect(refreshSession).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1000);
		expect(refreshSession).toHaveBeenCalledTimes(2);
	});
});
