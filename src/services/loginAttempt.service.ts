import { LOGIN_ATTEMPT_WINDOW_SECONDS, LoginAttemptModel } from '../models/LoginAttempt.js';

const MAX_ATTEMPTS_PER_WINDOW = 5;
const DUPLICATE_KEY_ERROR_CODE = 11000;

function windowCutoff(): Date {
	return new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_SECONDS * 1000);
}

function incrementAttempts(email: string) {
	return LoginAttemptModel.findOneAndUpdate(
		{ email },
		{ $inc: { count: 1 }, $setOnInsert: { windowStart: new Date() } },
		{ upsert: true, new: true },
	);
}

/**
 * Takes one of the email's attempts for the current window and says whether one was left. The
 * increment is a single atomic write done BEFORE the password check, so a burst of concurrent
 * requests cannot all read "under the limit" and each get a bcrypt guess.
 */
export async function reserveLoginAttempt(email: string): Promise<boolean> {
	// Mongo's TTL sweep only runs about once a minute, so drop an expired window here instead of
	// waiting for it; the upsert below then starts a fresh one at count 1.
	await LoginAttemptModel.deleteOne({ email, windowStart: { $lt: windowCutoff() } });

	let attempt;
	try {
		attempt = await incrementAttempts(email);
	} catch (error) {
		// Two first attempts for a new email can both try to insert; the loser hits the unique
		// index on `email`. The document exists by now, so one retry is a plain increment.
		if ((error as { code?: number }).code !== DUPLICATE_KEY_ERROR_CODE) throw error;
		attempt = await incrementAttempts(email);
	}

	return attempt.count <= MAX_ATTEMPTS_PER_WINDOW;
}

/** Gives back the attempt taken by reserveLoginAttempt — called after a successful login. */
export async function releaseLoginAttempt(email: string): Promise<void> {
	await LoginAttemptModel.updateOne({ email, count: { $gt: 0 } }, { $inc: { count: -1 } });
}
