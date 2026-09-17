import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
import { Types } from 'mongoose';

// In-memory fake collection for PasswordReset, mirroring the mocking style used in
// src/middleware/rateLimit.test.ts (mock the model, not a real DB).
type FakeDoc = {
	_id: Types.ObjectId;
	userId: Types.ObjectId;
	tokenHash: string;
	expiresAt: Date;
	createdAt: Date;
};

let docs: FakeDoc[] = [];

vi.mock('../models/PasswordReset.js', () => ({
	PasswordResetModel: {
		create: vi.fn(async (data: { userId: Types.ObjectId; tokenHash: string; expiresAt: Date }) => {
			const doc: FakeDoc = {
				_id: new Types.ObjectId(),
				userId: data.userId,
				tokenHash: data.tokenHash,
				expiresAt: data.expiresAt,
				createdAt: new Date(),
			};
			docs.push(doc);
			return doc;
		}),
		findOneAndDelete: vi.fn(async (filter: { tokenHash: string }) => {
			const idx = docs.findIndex((d) => d.tokenHash === filter.tokenHash);
			if (idx === -1) return null;
			const [doc] = docs.splice(idx, 1);
			return doc;
		}),
		countDocuments: vi.fn(async (filter: { userId: Types.ObjectId; createdAt?: { $gte: Date } }) => {
			return docs.filter((d) => {
				if (String(d.userId) !== String(filter.userId)) return false;
				if (filter.createdAt?.$gte && d.createdAt < filter.createdAt.$gte) return false;
				return true;
			}).length;
		}),
	},
}));

const {
	issuePasswordReset,
	verifyAndConsumePasswordResetToken,
	checkUnregisteredEmailRateLimit,
} = await import('./passwordReset.service.js');

function sha256Hex(raw: string): string {
	return createHash('sha256').update(raw).digest('hex');
}

describe('passwordReset.service — issue (T3, PRD AC-01, §6 NFR)', () => {
	beforeEach(() => {
		docs = [];
	});

	// Scope: "generate a raw token (crypto.randomBytes(32).toString('hex')) ... SHA-256 hash it,
	// store { userId, tokenHash, expiresAt: now+15m }". data-model.md: tokenHash is sha256 hex of
	// the raw emailed token; expiresAt = issuance + 15 minutes.
	it('returns a 64-hex-char raw token distinct from the stored, hashed tokenHash', async () => {
		const userId = new Types.ObjectId();
		const result = await issuePasswordReset(userId);

		expect(result.status).toBe('issued');
		if (result.status !== 'issued') throw new Error('expected issued');
		expect(result.token).toMatch(/^[0-9a-f]{64}$/);

		expect(docs).toHaveLength(1);
		expect(docs[0].tokenHash).toBe(sha256Hex(result.token));
		expect(docs[0].tokenHash).not.toBe(result.token);
	});

	it('persists { userId, tokenHash, expiresAt } with expiresAt ~15 minutes out (PRD §6 NFR: <= 15 min TTL)', async () => {
		const userId = new Types.ObjectId();
		const before = Date.now();

		await issuePasswordReset(userId);

		const after = Date.now();
		expect(docs).toHaveLength(1);
		expect(String(docs[0].userId)).toBe(String(userId));

		const expiresAtMs = docs[0].expiresAt.getTime();
		const fifteenMinMs = 15 * 60 * 1000;
		// tolerance comparison instead of strict equality, since issuance takes non-zero time
		expect(expiresAtMs).toBeGreaterThanOrEqual(before + fifteenMinMs - 1000);
		expect(expiresAtMs).toBeLessThanOrEqual(after + fifteenMinMs + 1000);
	});
});

describe('passwordReset.service — verify + consume (T3, PRD AC-01/AC-03 single-use)', () => {
	beforeEach(() => {
		docs = [];
	});

	// AC-01: a valid raw token succeeds exactly once (single-use, atomic findOneAndDelete per
	// data-model.md's "Single-use enforcement" note).
	it('succeeds exactly once for a valid raw token, then fails on second use with the same token', async () => {
		const userId = new Types.ObjectId();
		const { token } = (await issuePasswordReset(userId)) as { status: 'issued'; token: string };

		const first = await verifyAndConsumePasswordResetToken(token);
		expect(first.status).toBe('valid');
		if (first.status === 'valid') {
			expect(String(first.userId)).toBe(String(userId));
		}

		const second = await verifyAndConsumePasswordResetToken(token);
		expect(second.status).toBe('invalid');
	});

	// AC-03: expired/already-used/unknown tokens all get a "not found" style result, without
	// distinguishing whether the token ever existed.
	it('returns an "invalid" result (not a thrown error) for an unknown/never-issued token', async () => {
		const unknownRawToken = 'a'.repeat(64);

		const result = await verifyAndConsumePasswordResetToken(unknownRawToken);

		expect(result.status).toBe('invalid');
		expect('userId' in result).toBe(false);
	});

	it('returns "invalid" for a token whose stored document has already expired/been removed', async () => {
		const userId = new Types.ObjectId();
		const { token } = (await issuePasswordReset(userId)) as { status: 'issued'; token: string };

		// simulate TTL-index expiry deleting the document before verification
		docs = docs.filter((d) => d.tokenHash !== sha256Hex(token));

		const result = await verifyAndConsumePasswordResetToken(token);
		expect(result.status).toBe('invalid');
	});

	// The TTL index (`expireAfterSeconds: 0` on expiresAt) only deletes documents on MongoDB's
	// background sweep, which runs periodically rather than exactly at expiry — so a token can
	// remain in the collection for a window after it has technically expired. verify+consume must
	// not rely solely on document presence; it must check expiresAt itself (PRD §6 NFR: <= 15 min TTL).
	it('returns "invalid" for a token whose document is still present but expiresAt is in the past', async () => {
		const userId = new Types.ObjectId();
		const { token } = (await issuePasswordReset(userId)) as { status: 'issued'; token: string };

		docs[0].expiresAt = new Date(Date.now() - 1000);

		const result = await verifyAndConsumePasswordResetToken(token);
		expect(result.status).toBe('invalid');
	});
});

describe('passwordReset.service — rate limit, registered emails (PRD §6 NFR: <= 3/hour/email)', () => {
	beforeEach(() => {
		docs = [];
	});

	it('allows issuing when fewer than 3 recent PasswordReset documents exist for the userId', async () => {
		const userId = new Types.ObjectId();
		const now = new Date();
		docs.push(
			{ _id: new Types.ObjectId(), userId, tokenHash: 'x1', expiresAt: now, createdAt: now },
			{ _id: new Types.ObjectId(), userId, tokenHash: 'x2', expiresAt: now, createdAt: now },
		);

		const result = await issuePasswordReset(userId);

		expect(result.status).toBe('issued');
	});

	it('rejects issuing (attemptsRemaining <= 0) once 3 or more recent PasswordReset documents exist for the userId', async () => {
		const userId = new Types.ObjectId();
		const now = new Date();
		docs.push(
			{ _id: new Types.ObjectId(), userId, tokenHash: 'x1', expiresAt: now, createdAt: now },
			{ _id: new Types.ObjectId(), userId, tokenHash: 'x2', expiresAt: now, createdAt: now },
			{ _id: new Types.ObjectId(), userId, tokenHash: 'x3', expiresAt: now, createdAt: now },
		);

		const result = await issuePasswordReset(userId);

		expect(result.status).toBe('rate_limited');
		if (result.status === 'rate_limited') {
			expect(result.attemptsRemaining).toBeLessThanOrEqual(0);
		}
	});

	it('does not count a different userId toward the same rate-limit window', async () => {
		const userId = new Types.ObjectId();
		const otherUserId = new Types.ObjectId();
		const now = new Date();
		docs.push(
			{ _id: new Types.ObjectId(), userId: otherUserId, tokenHash: 'x1', expiresAt: now, createdAt: now },
			{ _id: new Types.ObjectId(), userId: otherUserId, tokenHash: 'x2', expiresAt: now, createdAt: now },
			{ _id: new Types.ObjectId(), userId: otherUserId, tokenHash: 'x3', expiresAt: now, createdAt: now },
		);

		const result = await issuePasswordReset(userId);

		expect(result.status).toBe('issued');
	});
});

describe('passwordReset.service — rate limit, unregistered emails (AC-02 gap, data-model.md)', () => {
	// AC-02: no PasswordReset document is created for an unknown email, so the userId_1-based
	// counter above cannot rate-limit this path — data-model.md's own suggested fix is a separate
	// short-lived counter (in-memory or IP-keyed) that is NOT backed by the PasswordReset
	// collection.
	const email = 'unregistered@example.test';

	beforeEach(() => {
		docs = [];
	});

	afterEach(() => {
		// best-effort: if the implementation exposes no reset hook, each test uses a unique email
		// to stay independent of prior tests' counters.
	});

	it('allows repeated requests for an email with no matching user up to the limit, without creating any PasswordReset document', () => {
		const testEmail = `unregistered-allow-${Date.now()}@example.test`;
		for (let i = 0; i < 3; i++) {
			const result = checkUnregisteredEmailRateLimit(testEmail);
			expect(result.allowed).toBe(true);
		}
		expect(docs).toHaveLength(0);
	});

	it('rejects a request beyond the limit for the same unregistered email', () => {
		const testEmail = `unregistered-reject-${Date.now()}@example.test`;
		for (let i = 0; i < 3; i++) {
			checkUnregisteredEmailRateLimit(testEmail);
		}

		const fourth = checkUnregisteredEmailRateLimit(testEmail);

		expect(fourth.allowed).toBe(false);
		expect(docs).toHaveLength(0);
	});

	it('tracks unregistered-email attempts independently per email address', () => {
		const emailA = `unregistered-a-${Date.now()}@example.test`;
		const emailB = `unregistered-b-${Date.now()}@example.test`;
		for (let i = 0; i < 3; i++) {
			checkUnregisteredEmailRateLimit(emailA);
		}

		const resultForB = checkUnregisteredEmailRateLimit(emailB);

		expect(resultForB.allowed).toBe(true);
	});
});
