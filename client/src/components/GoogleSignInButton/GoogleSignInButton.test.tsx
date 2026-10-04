import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';

const { mounts } = vi.hoisted(() => ({ mounts: { count: 0 } }));

// The real provider memoises its context without `locale` and loads the Google script once, so the
// only way to re-render the button in another language is to remount the provider.
vi.mock('@react-oauth/google', async () => {
	const { useEffect } = await import('react');
	return {
		GoogleOAuthProvider: ({ locale, children }: { locale?: string; children: React.ReactNode }) => {
			useEffect(() => {
				mounts.count += 1;
			}, []);
			return (
				<div data-testid="gsi-provider" data-locale={locale}>
					{children}
				</div>
			);
		},
		GoogleLogin: () => <span>google-button</span>,
	};
});

const { GoogleSignInButton } = await import('./GoogleSignInButton');

describe('GoogleSignInButton', () => {
	afterEach(() => {
		cleanup();
		mounts.count = 0;
	});

	it('asks Google for a Ukrainian button while the UI is Ukrainian', () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} />);

		expect(screen.getByTestId('gsi-provider')).toHaveAttribute('data-locale', 'uk');
		expect(screen.getByText('google-button')).toBeInTheDocument();
	});

	it('asks Google for an English button while the UI is English', async () => {
		await i18n.changeLanguage('en');
		render(<GoogleSignInButton onSuccess={vi.fn()} />);

		expect(screen.getByTestId('gsi-provider')).toHaveAttribute('data-locale', 'en');
	});

	it('remounts the provider with the new locale when the UI language changes', async () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} />);
		expect(mounts.count).toBe(1);

		await act(async () => {
			await i18n.changeLanguage('en');
		});

		expect(screen.getByTestId('gsi-provider')).toHaveAttribute('data-locale', 'en');
		expect(mounts.count).toBe(2);
	});
});
