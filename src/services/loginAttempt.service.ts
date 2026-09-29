import { LOGIN_ATTEMPT_WINDOW_SECONDS, LoginAttemptModel } from '../models/LoginAttempt.js';

const MAX_FAILED_ATTEMPTS_PER_WINDOW = 5;

function windowCutoff(): Date {
	return new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_SECONDS * 1000);
}

export async function isLoginBlocked(email: string): Promise<boolean> {
	// Ignore a window older than the cutoff rather than trusting Mongo's TTL sweep (~60s cadence)
	// to have deleted it already.
	const attempt = await LoginAttemptModel.findOne({ email, windowStart: { $gte: windowCutoff() } });
	return (attempt?.count ?? 0) >= MAX_FAILED_ATTEMPTS_PER_WINDOW;
}

export async function recordFailedLogin(email: string): Promise<void> {
	// Drop an expired window first so the upsert below starts a fresh one at count 1.
	await LoginAttemptModel.deleteOne({ email, windowStart: { $lt: windowCutoff() } });
	await LoginAttemptModel.findOneAndUpdate(
		{ email },
		{ $inc: { count: 1 }, $setOnInsert: { windowStart: new Date() } },
		{ upsert: true },
	);
}
