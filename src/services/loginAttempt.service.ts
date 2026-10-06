import { LOGIN_ATTEMPT_WINDOW_SECONDS, LoginAttemptModel } from '../models/LoginAttempt.js';
import { releaseIpAttempt, reserveIpAttempt } from './ipAttempt.service.js';

// Two counters per login. The strict one is per email AND address, so someone else's failed logins
// from their own address never lock the owner out. The per-email one is only a high ceiling against
// password guessing spread over many addresses: reaching it takes ~6x the failed logins the strict
// limit allows, but it can still be used to lock an email out (ADR-0004).
const MAX_ATTEMPTS_PER_EMAIL_AND_IP = 5;
const MAX_ATTEMPTS_PER_EMAIL = 30;
const DUPLICATE_KEY_ERROR_CODE = 11000;

function emailAndIpKey(email: string, ip: string | undefined): string {
	return `login:${email}|${ip ?? 'unknown'}`;
}

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
 * Takes one login attempt for the current window and says whether one was left, for both the
 * email+address pair and the email as a whole. The pair is checked first, so a client that is
 * already over its own limit never uses up the shared ceiling. The increments are single atomic
 * writes done BEFORE the password check, so a burst of concurrent requests cannot all read "under
 * the limit" and each get a bcrypt guess.
 */
export async function reserveLoginAttempt(email: string, ip: string | undefined): Promise<boolean> {
	if (!(await reserveIpAttempt(emailAndIpKey(email, ip), MAX_ATTEMPTS_PER_EMAIL_AND_IP))) {
		return false;
	}
	return reserveEmailAttempt(email);
}

async function reserveEmailAttempt(email: string): Promise<boolean> {
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

	return attempt.count <= MAX_ATTEMPTS_PER_EMAIL;
}

/** Gives back the attempts taken by reserveLoginAttempt — called after a successful login. */
export async function releaseLoginAttempt(email: string, ip: string | undefined): Promise<void> {
	await Promise.all([
		releaseIpAttempt(emailAndIpKey(email, ip)),
		LoginAttemptModel.updateOne({ email, count: { $gt: 0 } }, { $inc: { count: -1 } }),
	]);
}
