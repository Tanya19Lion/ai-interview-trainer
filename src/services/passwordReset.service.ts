import { randomBytes, createHash } from 'crypto';
import type { Types } from 'mongoose';
import { PasswordResetModel } from '../models/PasswordReset.js';
import { RESET_REQUEST_WINDOW_SECONDS, ResetRequestAttemptModel } from '../models/ResetRequestAttempt.js';

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const DUPLICATE_KEY_ERROR_CODE = 11000;

export type IssuePasswordResetResult =
	| { status: 'issued'; token: string }
	| { status: 'rate_limited'; attemptsRemaining: number };

export type VerifyAndConsumeResult = { status: 'valid'; userId: Types.ObjectId } | { status: 'invalid' };

export type ReserveResetRequestResult = { allowed: boolean; attemptsRemaining: number };

function hashToken(rawToken: string): string {
	return createHash('sha256').update(rawToken).digest('hex');
}

export async function issuePasswordReset(userId: Types.ObjectId): Promise<IssuePasswordResetResult> {
	const now = new Date();
	const recentCount = await PasswordResetModel.countDocuments({
		userId,
		createdAt: { $gte: new Date(now.getTime() - RATE_LIMIT_WINDOW_MS) },
	});

	if (recentCount >= RATE_LIMIT_MAX) {
		return { status: 'rate_limited', attemptsRemaining: RATE_LIMIT_MAX - recentCount };
	}

	const token = randomBytes(32).toString('hex');
	const tokenHash = hashToken(token);
	const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

	await PasswordResetModel.create({ userId, tokenHash, expiresAt });

	return { status: 'issued', token };
}

export async function verifyAndConsumePasswordResetToken(rawToken: string): Promise<VerifyAndConsumeResult> {
	const tokenHash = hashToken(rawToken);
	const doc = await PasswordResetModel.findOneAndDelete({ tokenHash });

	// The TTL index only deletes expired documents on MongoDB's periodic background sweep, not
	// exactly at expiresAt — don't rely on document absence alone to reject expired tokens.
	if (!doc || doc.expiresAt.getTime() <= Date.now()) {
		return { status: 'invalid' };
	}

	return { status: 'valid', userId: doc.userId };
}

export async function sendResetEmail(email: string, rawToken: string): Promise<void> {
	const link = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
	const apiKey = process.env.RESEND_API_KEY;

	if (!apiKey) {
		// Never log the link in production: Vercel function logs are readable by everyone with
		// project access, so a logged token would be a live credential.
		if (process.env.NODE_ENV === 'production') {
			throw new Error('RESEND_API_KEY is not set');
		}
		console.log(`[dev] password reset link for ${email}: ${link}`);
		return;
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			from: process.env.MAIL_FROM,
			to: [email],
			subject: 'Скидання пароля — AI Interview Trainer',
			text: `Щоб задати новий пароль, перейдіть за посиланням (дійсне 15 хвилин):\n${link}\n\nЯкщо ви не просили скидання, просто проігноруйте цей лист.`,
		}),
	});

	if (!response.ok) {
		throw new Error(`Resend responded with ${response.status}`);
	}
}

function incrementResetRequests(email: string) {
	return ResetRequestAttemptModel.findOneAndUpdate(
		{ email },
		{ $inc: { count: 1 }, $setOnInsert: { windowStart: new Date() } },
		{ upsert: true, new: true },
	);
}

/**
 * Counts one reset request for `email` in the current hour, whether or not an account exists for
 * it, so a known and an unknown address hit the limit after the same number of requests (AC-02).
 * Same atomic upsert as reserveLoginAttempt; the expired window is dropped here because Mongo's
 * TTL sweep only runs about once a minute.
 */
export async function reserveResetRequest(email: string): Promise<ReserveResetRequestResult> {
	const key = email.trim().toLowerCase();
	await ResetRequestAttemptModel.deleteOne({
		email: key,
		windowStart: { $lt: new Date(Date.now() - RESET_REQUEST_WINDOW_SECONDS * 1000) },
	});

	let attempt;
	try {
		attempt = await incrementResetRequests(key);
	} catch (error) {
		// Two first requests for a new email can both try to insert; the loser hits the unique index.
		if ((error as { code?: number }).code !== DUPLICATE_KEY_ERROR_CODE) throw error;
		attempt = await incrementResetRequests(key);
	}

	return { allowed: attempt.count <= RATE_LIMIT_MAX, attemptsRemaining: Math.max(0, RATE_LIMIT_MAX - attempt.count) };
}
