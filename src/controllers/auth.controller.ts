import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserModel, type User } from '../models/User.js';
import type { AuthedRequest } from '../middleware/auth.js';
import type { HydratedDocument } from 'mongoose';

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

function signToken(userId: string): string {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET is not set');
	}
	const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as jwt.SignOptions['expiresIn'];
	return jwt.sign({ userId }, secret, { expiresIn });
}

function issueSession(res: Response, user: HydratedDocument<User>): void {
	const token = signToken(user.id);
	res.cookie('token', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
	res.json({
		user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
	});
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
	const { idToken } = req.body as { idToken?: string };
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

	issueSession(res, user);
}

export async function register(req: Request, res: Response): Promise<void> {
	const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
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

	issueSession(res, user);
}

export async function login(req: Request, res: Response): Promise<void> {
	const { email, password } = req.body as { email?: string; password?: string };
	if (!email || !password) {
		res.status(400).json({ error: 'email and password are required' });
		return;
	}

	const user = await UserModel.findOne({ email });
	if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
		res.status(401).json({ error: 'Invalid email or password' });
		return;
	}

	issueSession(res, user);
}

export function logout(_req: Request, res: Response): void {
	res.clearCookie('token');
	res.json({ ok: true });
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
