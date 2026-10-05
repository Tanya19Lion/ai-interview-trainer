import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './config/db.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
