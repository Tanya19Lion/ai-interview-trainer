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

// Same idea for the per-email request counter (ResetRequestAttempt): one document per email.
type FakeAttempt = { email: string; windowStart: Date; count: number };

let attempts: FakeAttempt[] = [];

vi.mock('../models/ResetRequestAttempt.js', () => ({
	RESET_REQUEST_WINDOW_SECONDS: 3600,
	ResetRequestAttemptModel: {
		deleteOne: vi.fn(async (filter: { email: string; windowStart: { $lt: Date } }) => {
			const idx = attempts.findIndex((a) => a.email === filter.email && a.windowStart < filter.windowStart.$lt);
			if (idx !== -1) attempts.splice(idx, 1);
		}),
		findOneAndUpdate: vi.fn(async (filter: { email: string }) => {
			let attempt = attempts.find((a) => a.email === filter.email);
			if (!attempt) {
				attempt = { email: filter.email, windowStart: new Date(), count: 0 };
				attempts.push(attempt);
			}
			attempt.count += 1;
			return attempt;
		}),
	},
}));

const {
	issuePasswordReset,
	verifyAndConsumePasswordResetToken,
	reserveResetRequest,
	sendResetEmail,
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
			expect(result.attemptsRemaining).toBe(0);
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

describe('passwordReset.service — reserveResetRequest (T6, AC-02: one counter for known and unknown emails)', () => {
	beforeEach(() => {
		attempts = [];
	});

	it('allows 3 requests per email, reporting how many are left, and rejects the 4th', async () => {
		const email = 'someone@example.test';

		const results = [];
		for (let i = 0; i < 4; i++) results.push(await reserveResetRequest(email));

		expect(results).toEqual([
			{ allowed: true, attemptsRemaining: 2 },
			{ allowed: true, attemptsRemaining: 1 },
			{ allowed: true, attemptsRemaining: 0 },
			{ allowed: false, attemptsRemaining: 0 },
		]);
	});

	it('counts each email separately', async () => {
		for (let i = 0; i < 3; i++) await reserveResetRequest('a@example.test');

		expect(await reserveResetRequest('b@example.test')).toEqual({ allowed: true, attemptsRemaining: 2 });
	});

	it('treats differently-cased spellings of one email as the same email', async () => {
		for (let i = 0; i < 3; i++) await reserveResetRequest('Mixed@Example.test');

		expect((await reserveResetRequest('mixed@example.test')).allowed).toBe(false);
	});

	it('starts a fresh window once the previous one is older than an hour', async () => {
		const email = 'window@example.test';
		for (let i = 0; i < 3; i++) await reserveResetRequest(email);
		attempts[0].windowStart = new Date(Date.now() - 61 * 60 * 1000);

		expect(await reserveResetRequest(email)).toEqual({ allowed: true, attemptsRemaining: 2 });
	});
});

describe('passwordReset.service — sendResetEmail (T5)', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
		vi.stubEnv('CLIENT_URL', 'https://app.example.test');
		vi.stubEnv('MAIL_FROM', 'Interview Trainer <noreply@example.test>');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('POSTs to the Resend API with the bearer key, sender, recipient and a reset link containing the token', async () => {
		vi.stubEnv('RESEND_API_KEY', 're_test_key');
		fetchMock.mockResolvedValue({ ok: true });

		await sendResetEmail('user@example.test', 'abc123');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.resend.com/emails');
		expect(init.method).toBe('POST');
		expect(init.headers.Authorization).toBe('Bearer re_test_key');
		const body = JSON.parse(init.body);
		expect(body.from).toBe('Interview Trainer <noreply@example.test>');
		expect(body.to).toEqual(['user@example.test']);
		expect(body.text).toContain('https://app.example.test/reset-password?token=abc123');
	});

	it('throws when Resend answers with a non-2xx status', async () => {
		vi.stubEnv('RESEND_API_KEY', 're_test_key');
		fetchMock.mockResolvedValue({ ok: false, status: 403 });

		await expect(sendResetEmail('user@example.test', 'abc123')).rejects.toThrow(/403/);
	});

	it('throws in production when RESEND_API_KEY is missing, without calling Resend or logging the token', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('RESEND_API_KEY', '');
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		await expect(sendResetEmail('user@example.test', 'abc123')).rejects.toThrow(/RESEND_API_KEY/);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(logSpy).not.toHaveBeenCalled();
		logSpy.mockRestore();
	});

	it('outside production with no RESEND_API_KEY, logs the link instead of calling Resend', async () => {
		vi.stubEnv('NODE_ENV', 'development');
		vi.stubEnv('RESEND_API_KEY', '');
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		await sendResetEmail('user@example.test', 'abc123');

		expect(fetchMock).not.toHaveBeenCalled();
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/reset-password?token=abc123'));
		logSpy.mockRestore();
	});
});
