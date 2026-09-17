import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserModel, type User } from '../models/User.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { hasValidTokenVersion, verifyToken } from '../middleware/auth.js';
import type { HydratedDocument } from 'mongoose';
import { verifyAndConsumePasswordResetToken } from '../services/passwordReset.service.js';

const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;

let oauthClient: OAuth2Client | undefined;

function getOAuthClient(): OAuth2Client {
	if (!oauthClient) {
		const clientId = process.env.GOOGLE_CLIENT_ID;
		if (!clientId) {
			throw new Error('GOOGLE_CLIENT_ID is not set');
		}
		oauthClient = new OAuth2Client(clientId);
	}
	return oauthClient;
}

const REMEMBER_ME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function signToken(userId: string, tokenVersion: number, expiresIn: jwt.SignOptions['expiresIn']): string {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET is not set');
	}
	return jwt.sign({ userId, tokenVersion }, secret, { expiresIn });
}

export function issueSession(res: Response, user: HydratedDocument<User>, rememberMe?: boolean): void {
	const tokenVersion = user.tokenVersion ?? 0;
	const accessExpiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as jwt.SignOptions['expiresIn'];
	const token = signToken(user.id, tokenVersion, accessExpiresIn);
	res.cookie('token', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_MS } : {}),
	});

	if (rememberMe) {
		const refreshToken = signToken(user.id, tokenVersion, '7d');
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: REMEMBER_ME_MAX_AGE_MS,
		});
	}

	res.json({
		user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
	});
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
	const { idToken, rememberMe } = req.body as { idToken?: string; rememberMe?: boolean };
	if (!idToken) {
		res.status(400).json({ error: 'idToken is required' });
		return;
	}

	const ticket = await getOAuthClient().verifyIdToken({
		idToken,
		audience: process.env.GOOGLE_CLIENT_ID,
	});
	const payload = ticket.getPayload();
	if (!payload?.sub || !payload.email) {
		res.status(401).json({ error: 'Invalid Google token' });
		return;
	}

	let user = await UserModel.findOne({ googleId: payload.sub });
	if (!user) {
		// Link to an existing email/password account instead of hitting the unique-email
		// constraint with a second document for the same person.
		user = await UserModel.findOneAndUpdate(
			{ email: payload.email },
			{
				googleId: payload.sub,
				email: payload.email,
				name: payload.name ?? payload.email,
				avatarUrl: payload.picture,
			},
			{ upsert: true, new: true },
		);
	}
	if (!user) {
		res.status(500).json({ error: 'Failed to create or update user' });
		return;
	}

	issueSession(res, user, rememberMe);
}

export async function register(req: Request, res: Response): Promise<void> {
	const { email, password, name, rememberMe } = req.body as {
		email?: string;
		password?: string;
		name?: string;
		rememberMe?: boolean;
	};
	if (!email || !password || !name) {
		res.status(400).json({ error: 'email, password and name are required' });
		return;
	}
	if (password.length < PASSWORD_MIN_LENGTH) {
		res.status(400).json({ error: `password must be at least ${PASSWORD_MIN_LENGTH} characters` });
		return;
	}

	const existing = await UserModel.findOne({ email });
	if (existing) {
		res.status(409).json({ error: 'email is already registered' });
		return;
	}

	const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
	const user = await UserModel.create({ email, name, passwordHash });

	issueSession(res, user, rememberMe);
}

export async function login(req: Request, res: Response): Promise<void> {
	const { email, password, rememberMe } = req.body as { email?: string; password?: string; rememberMe?: boolean };
	if (!email || !password) {
		res.status(400).json({ error: 'email and password are required' });
		return;
	}

	const user = await UserModel.findOne({ email });
	if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
		res.status(401).json({ error: 'Invalid email or password' });
		return;
	}

	issueSession(res, user, rememberMe);
}

export async function refreshSession(req: Request, res: Response): Promise<void> {
	const refreshToken = req.cookies?.refreshToken as string | undefined;
	if (!refreshToken) {
		res.status(401).json({ code: 'auth.refresh_token_expired', message: 'Your session has expired. Please sign in again.' });
		return;
	}

	// verifyToken's signature/expiry check reads only the server clock + the token's own embedded
	// timestamp — no clockTimestamp option or client-supplied time is ever passed in (QG-3).
	const payload = verifyToken(refreshToken);
	if (!payload) {
		res.status(401).json({ code: 'auth.refresh_token_expired', message: 'Your session has expired. Please sign in again.' });
		return;
	}

	const user = await UserModel.findById(payload.userId);
	if (!user || !hasValidTokenVersion(payload.tokenVersion, user.tokenVersion)) {
		res.status(401).json({ code: 'auth.session_revoked', message: 'Your session was ended. Please sign in again.' });
		return;
	}

	const accessExpiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as jwt.SignOptions['expiresIn'];
	const token = signToken(user.id, payload.tokenVersion, accessExpiresIn);
	res.cookie('token', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		// refreshSession only ever runs for a remembered session (only rememberMe issues a
		// refreshToken in the first place), so the renewed access cookie must stay persistent too —
		// otherwise it silently downgrades to a session-only cookie on every refresh.
		maxAge: REMEMBER_ME_MAX_AGE_MS,
	});
	res.json({ ok: true });
}

function decodeUserId(cookieValue: string | undefined): string | undefined {
	if (!cookieValue) {
		return undefined;
	}
	return verifyToken<{ userId: string }>(cookieValue)?.userId;
}

export async function logout(req: Request, res: Response): Promise<void> {
	const token = req.cookies?.token as string | undefined;
	const refreshToken = req.cookies?.refreshToken as string | undefined;

	// The access token may already be expired/missing while the longer-lived refreshToken is
	// still valid — fall back to it so logout still revokes the session server-side (AC-07)
	// instead of leaving a live refreshToken usable after the user believes they've logged out.
	const userId = decodeUserId(token) ?? decodeUserId(refreshToken);
	if (userId) {
		await UserModel.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
	}

	res.clearCookie('token');
	res.clearCookie('refreshToken');
	res.json({ ok: true });
}

function validateConfirmPasswordResetInput(token: string | undefined, newPassword: string | undefined): string | null {
	if (!token || !newPassword) {
		return 'token and newPassword are required';
	}
	if (newPassword.length < PASSWORD_MIN_LENGTH) {
		return `password must be at least ${PASSWORD_MIN_LENGTH} characters`;
	}
	return null;
}

async function applyPasswordReset(userId: string, newPassword: string): Promise<void> {
	const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
	await UserModel.findByIdAndUpdate(userId, { passwordHash, $inc: { tokenVersion: 1 } });
}

export async function confirmPasswordReset(req: Request, res: Response): Promise<void> {
	const { token, newPassword } = req.body as { token?: string; newPassword?: string };
	const validationError = validateConfirmPasswordResetInput(token, newPassword);
	if (validationError) {
		res.status(400).json({ code: 'password_reset.invalid_request', message: validationError });
		return;
	}

	const result = await verifyAndConsumePasswordResetToken(token as string);
	if (result.status !== 'valid') {
		res.status(400).json({
			code: 'password_reset.invalid_or_expired_token',
			message: 'This password reset link is invalid or has expired.',
		});
		return;
	}

	await applyPasswordReset(result.userId, newPassword as string);

	res.json({ message: 'Your password has been reset. Please sign in again.' });
}

export async function me(req: AuthedRequest, res: Response): Promise<void> {
	const user = await UserModel.findById(req.userId);
	if (!user) {
		res.status(404).json({ error: 'User not found' });
		return;
	}
	res.json({
		user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
	});
}
