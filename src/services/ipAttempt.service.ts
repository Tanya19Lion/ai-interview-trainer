import { IP_ATTEMPT_WINDOW_SECONDS, IpAttemptModel } from '../models/IpAttempt.js';

const DUPLICATE_KEY_ERROR_CODE = 11000;

function windowCutoff(): Date {
	return new Date(Date.now() - IP_ATTEMPT_WINDOW_SECONDS * 1000);
}

function incrementAttempts(key: string) {
	return IpAttemptModel.findOneAndUpdate(
		{ key },
		{ $inc: { count: 1 }, $setOnInsert: { windowStart: new Date() } },
		{ upsert: true, new: true },
	);
}

/**
 * Counts one request against `key` for the current window and says whether it is still within
 * `maxAttempts`. Same shape as reserveLoginAttempt: the expired window is dropped here (Mongo's
 * TTL sweep only runs about once a minute) and the increment is a single atomic write. Nothing is
 * given back unless the caller calls releaseIpAttempt — by default every request counts,
 * successful or not.
 */
export async function reserveIpAttempt(key: string, maxAttempts: number): Promise<boolean> {
	await IpAttemptModel.deleteOne({ key, windowStart: { $lt: windowCutoff() } });

	let attempt;
	try {
		attempt = await incrementAttempts(key);
	} catch (error) {
		// Two first requests for a new key can both try to insert; the loser hits the unique index.
		if ((error as { code?: number }).code !== DUPLICATE_KEY_ERROR_CODE) throw error;
		attempt = await incrementAttempts(key);
	}

	return attempt.count <= maxAttempts;
}

/** Gives back one attempt taken by reserveIpAttempt; never takes the count below zero. */
export async function releaseIpAttempt(key: string): Promise<void> {
	await IpAttemptModel.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });
}
