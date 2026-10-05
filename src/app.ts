import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { historyRouter } from './routes/history.routes.js';
import { interviewRouter } from './routes/interview.routes.js';
import { statsRouter } from './routes/stats.routes.js';

export const app = express();

// Vercel puts its own proxy in front of the function; without this `req.ip` is that proxy's
// address and every visitor shares one ipRateLimit bucket. Vercel sets X-Forwarded-For itself, so
// one hop is trusted. Off elsewhere: with no proxy, a client could forge the header.
if (process.env.VERCEL) {
	app.set('trust proxy', 1);
}

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/history', historyRouter);
app.use('/api/stats', statsRouter);

app.use(errorHandler);
