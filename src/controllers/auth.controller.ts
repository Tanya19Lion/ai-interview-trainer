import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import type { AuthedRequest } from '../middleware/auth.js';

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

	const user = await UserModel.findOneAndUpdate(
		{ googleId: payload.sub },
		{
			googleId: payload.sub,
			email: payload.email,
			name: payload.name ?? payload.email,
			avatarUrl: payload.picture,
		},
		{ upsert: true, new: true },
	);

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
