import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api/client';
import { RENEWAL_INTERVAL_MS } from './hooks/useAuth';
import { RequireAuth } from './RequireAuth';

vi.mock('./api/auth', () => ({
	fetchMe: vi.fn(),
	refreshSession: vi.fn(),
}));

const { fetchMe, refreshSession } = await import('./api/auth');

function renderRequireAuth() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<RequireAuth>
					<div>protected content</div>
				</RequireAuth>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

// Flushes pending promises (query resolution, retry scheduling) without relying on real time,
// which vi.waitFor needs but fake timers never advance on their own.
async function flush() {
	for (let i = 0; i < 5; i++) {
		await vi.advanceTimersByTimeAsync(0);
	}
}

describe('RequireAuth redirect', () => {
	afterEach(() => cleanup());

	it('sends an unauthenticated visitor to /login and remembers where they were headed', async () => {
		vi.mocked(fetchMe).mockReset();
		vi.mocked(fetchMe).mockRejectedValue(new ApiError('Unauthorized', 401));

		function LoginProbe() {
			const location = useLocation();
			const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
			return <div>login page, from {from}</div>;
		}

		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { findByText } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/history']}>
					<Routes>
						<Route path="/login" element={<LoginProbe />} />
						<Route
							path="/history"
							element={
								<RequireAuth>
									<div>protected content</div>
								</RequireAuth>
							}
						/>
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>,
		);

		expect(await findByText('login page, from /history')).toBeTruthy();
	});
});

describe('RequireAuth silent token renewal', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(fetchMe).mockReset();
		vi.mocked(refreshSession).mockReset();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('keeps renewing the access token in the background for an authenticated session', async () => {
		vi.mocked(fetchMe).mockResolvedValue({ user: { id: '1', email: 'a@example.test', name: 'A' } });
		vi.mocked(refreshSession).mockResolvedValue(undefined);

		renderRequireAuth();
		await flush();

		expect(refreshSession).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS);

		expect(refreshSession).toHaveBeenCalledTimes(2);
	});

	it('does not attempt renewal while the session is not authenticated', async () => {
		vi.mocked(fetchMe).mockRejectedValue(new ApiError('Unauthorized', 401));

		renderRequireAuth();
		await flush();

		expect(fetchMe).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS * 2);

		expect(refreshSession).not.toHaveBeenCalled();
	});

	it("hands off to useMe()'s 401 handling once the remembered session has actually ended", async () => {
		vi.mocked(fetchMe).mockResolvedValue({ user: { id: '1', email: 'a@example.test', name: 'A' } });
		vi.mocked(refreshSession).mockRejectedValue(new ApiError('Refresh token expired', 401));

		renderRequireAuth();
		await flush();

		expect(refreshSession).toHaveBeenCalledTimes(1);
		expect(fetchMe).toHaveBeenCalledTimes(2);
	});
});
