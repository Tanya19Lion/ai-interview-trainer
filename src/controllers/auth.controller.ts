import type { CookieOptions, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserModel, type User } from '../models/User.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { hasValidTokenVersion, verifyToken } from '../middleware/auth.js';
import type { HydratedDocument, Types } from 'mongoose';
import { releaseLoginAttempt } from '../services/loginAttempt.service.js';
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

function accessTokenExpiresIn(): jwt.SignOptions['expiresIn'] {
	return (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as jwt.SignOptions['expiresIn'];
}

// `persistent` controls whether the cookie survives the browser session (`maxAge` set) or is
// session-only. `refreshSession` always passes true: it only ever runs for a remembered session
// (only rememberMe issues a refreshToken in the first place), so the renewed access cookie must
// stay persistent too — otherwise it silently downgrades to a session-only cookie on every
// refresh.
function authCookieOptions(persistent: boolean): CookieOptions {
	return {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		...(persistent ? { maxAge: REMEMBER_ME_MAX_AGE_MS } : {}),
	};
}

function toAuthUserPayload(user: HydratedDocument<User>) {
	return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

function setSessionCookies(res: Response, user: HydratedDocument<User>, rememberMe?: boolean): void {
	const tokenVersion = user.tokenVersion ?? 0;
	const token = signToken(user.id, tokenVersion, accessTokenExpiresIn());
	res.cookie('token', token, authCookieOptions(Boolean(rememberMe)));

	if (rememberMe) {
		const refreshToken = signToken(user.id, tokenVersion, '7d');
		res.cookie('refreshToken', refreshToken, authCookieOptions(true));
	}
}

export function issueSession(res: Response, user: HydratedDocument<User>, rememberMe?: boolean): void {
	setSessionCookies(res, user, rememberMe);
	res.json({ user: toAuthUserPayload(user) });
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
	const { idToken, rememberMe } = req.body as { idToken?: string; rememberMe?: boolean };
	if (typeof idToken !== 'string' || !idToken) {
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
	// typeof guards keep a JSON object (e.g. {"$ne": ""}) from reaching a Mongoose filter.
	if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string' || !email || !password || !name) {
		res.status(400).json({ error: 'email, password and name are required' });
		return;
	}
	const passwordError = passwordTooShort(password);
	if (passwordError) {
		res.status(400).json({ error: passwordError });
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
	if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
		res.status(400).json({ error: 'email and password are required' });
		return;
	}

	const user = await UserModel.findOne({ email });
	if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
		res.status(401).json({ error: 'Invalid email or password' });
		return;
	}

	// loginRateLimit reserved an attempt before this check; a successful login gives it back.
	await releaseLoginAttempt(email);
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

	const token = signToken(user.id, payload.tokenVersion, accessTokenExpiresIn());
	res.cookie('token', token, authCookieOptions(true));
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

function passwordTooShort(password: string): string | null {
	return password.length < PASSWORD_MIN_LENGTH ? `password must be at least ${PASSWORD_MIN_LENGTH} characters` : null;
}

function validateConfirmPasswordResetInput(token: unknown, newPassword: unknown): string | null {
	if (typeof token !== 'string' || typeof newPassword !== 'string' || !token || !newPassword) {
		return 'token and newPassword are required';
	}
	return passwordTooShort(newPassword);
}

async function applyPasswordReset(userId: Types.ObjectId | string, newPassword: string): Promise<HydratedDocument<User> | null> {
	const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
	return UserModel.findByIdAndUpdate(userId, { passwordHash, $inc: { tokenVersion: 1 } }, { new: true });
}

function sendInvalidOrExpiredToken(res: Response): void {
	res.status(400).json({
		code: 'password_reset.invalid_or_expired_token',
		message: 'This password reset link is invalid or has expired.',
	});
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
		sendInvalidOrExpiredToken(res);
		return;
	}

	const updated = await applyPasswordReset(result.userId, newPassword as string);
	if (!updated) {
		sendInvalidOrExpiredToken(res);
		return;
	}

	res.json({ message: 'Your password has been reset. Please sign in again.' });
}

export async function changePassword(req: AuthedRequest, res: Response): Promise<void> {
	const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
	if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
		res.status(400).json({ code: 'auth.invalid_request', message: 'currentPassword and newPassword are required' });
		return;
	}
	const passwordError = passwordTooShort(newPassword);
	if (passwordError) {
		res.status(400).json({ code: 'auth.invalid_request', message: passwordError });
		return;
	}

	const user = await UserModel.findById(req.userId);
	if (!user) {
		res.status(404).json({ error: 'User not found' });
		return;
	}
	if (!user.passwordHash) {
		res.status(409).json({
			code: 'auth.google_account_no_password',
			message: 'This account signs in with Google and has no password to change.',
		});
		return;
	}
	if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
		res.status(400).json({ code: 'auth.invalid_current_password', message: 'Your current password is incorrect.' });
		return;
	}

	const updated = await applyPasswordReset(user.id, newPassword);
	if (!updated) {
		res.status(404).json({ error: 'User not found' });
		return;
	}

	// The bumped tokenVersion revokes every session, this one included — reissue the cookie so the
	// user who just changed their password stays signed in. A refreshToken cookie means the session
	// was a remembered one, so the new cookies stay persistent.
	setSessionCookies(res, updated, Boolean(req.cookies?.refreshToken));
	res.json({ message: 'Password updated.' });
}

export async function me(req: AuthedRequest, res: Response): Promise<void> {
	const user = await UserModel.findById(req.userId);
	if (!user) {
		res.status(404).json({ error: 'User not found' });
		return;
	}
	res.json({ user: toAuthUserPayload(user) });
}
