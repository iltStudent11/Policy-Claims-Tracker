import express from 'express';
import authRouter from './routes/auth';
import connectDb from './config/db';

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(express.json());

app.get('/health', (_req, res) => {
	res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error(error);
	res.status(500).json({ message: 'Internal server error' });
});

const startServer = async () => {
	await connectDb();
	app.listen(port, () => {
		console.log(`capstone-api running on port ${port}`);
	});
};

startServer().catch((error) => {
	console.error('Failed to start server', error);
	process.exit(1);
});
