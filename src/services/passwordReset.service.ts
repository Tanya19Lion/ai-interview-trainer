import { randomBytes, createHash } from 'crypto';
import type { Types } from 'mongoose';
import { PasswordResetModel } from '../models/PasswordReset.js';

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export type IssuePasswordResetResult =
	| { status: 'issued'; token: string }
	| { status: 'rate_limited'; attemptsRemaining: number };

export type VerifyAndConsumeResult = { status: 'valid'; userId: Types.ObjectId } | { status: 'invalid' };

export type UnregisteredEmailRateLimitResult = { allowed: boolean };

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

const unregisteredEmailAttempts = new Map<string, number[]>();

function pruneAttemptsWithinWindow(email: string, now: number): number[] {
	return (unregisteredEmailAttempts.get(email) ?? []).filter((timestamp) => timestamp > now - RATE_LIMIT_WINDOW_MS);
}

export function checkUnregisteredEmailRateLimit(email: string): UnregisteredEmailRateLimitResult {
	const now = Date.now();
	const attempts = pruneAttemptsWithinWindow(email, now);

	if (attempts.length >= RATE_LIMIT_MAX) {
		unregisteredEmailAttempts.set(email, attempts);
		return { allowed: false };
	}

	attempts.push(now);
	unregisteredEmailAttempts.set(email, attempts);
	return { allowed: true };
}
