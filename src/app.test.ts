import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'net';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

async function loadApp() {
	vi.resetModules();
	// mongoose keeps registered models across module resets, so a second import of the models
	// would throw OverwriteModelError.
	mongoose.deleteModel(/.*/);
	return (await import('./app.js')).app;
}

describe('app', () => {
	it('trusts one proxy hop on Vercel, so req.ip is the visitor and not Vercel', async () => {
		vi.stubEnv('VERCEL', '1');

		expect((await loadApp()).get('trust proxy')).toBe(1);
	});

	it('does not trust X-Forwarded-For anywhere else, where a client could forge it', async () => {
		vi.stubEnv('VERCEL', '');

		expect((await loadApp()).get('trust proxy')).toBeFalsy();
	});

	it('answers GET /health without anything having started a server or a database connection', async () => {
		const server = (await loadApp()).listen(0);
		await new Promise<void>((resolve) => server.once('listening', resolve));
		try {
			const { port } = server.address() as AddressInfo;
			const res = await fetch(`http://127.0.0.1:${port}/health`);

			expect(res.status).toBe(200);
			expect(await res.json()).toMatchObject({ status: 'ok' });
		} finally {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		}
	});
});
