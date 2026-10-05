// Vercel entry point: every /api/* and /health request is rewritten here (see vercel.json).
// It loads the app compiled by `npm run build` (dist/), so Vercel does not have to compile the
// TypeScript sources itself. Locally the server still starts from src/index.ts.
import { app } from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';

// One MongoDB connection per warm function instance, shared by every request it serves.
let connecting;

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export default async function handler(req, res) {
	try {
		connecting ??= connectDB();
		await connecting;
	} catch (error) {
		// Forget the failed attempt so the next request retries instead of replaying the rejection.
		connecting = undefined;
		console.error('MongoDB connection failed:', error);
		res.statusCode = 503;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({ error: 'Service unavailable' }));
		return;
	}

	app(req, res);
}
