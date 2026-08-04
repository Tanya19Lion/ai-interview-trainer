import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { connectDB } from './config/db.js';
import { authRouter } from './routes/auth.routes.js';
import { historyRouter } from './routes/history.routes.js';
import { interviewRouter } from './routes/interview.routes.js';
import { statsRouter } from './routes/stats.routes.js';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/history', historyRouter);
app.use('/api/stats', statsRouter);

async function main(): Promise<void> {
	await connectDB();
	app.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
}

main().catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
