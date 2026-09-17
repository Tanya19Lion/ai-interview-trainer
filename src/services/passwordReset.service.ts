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

	if (!doc) {
		return { status: 'invalid' };
	}

	return { status: 'valid', userId: doc.userId };
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
