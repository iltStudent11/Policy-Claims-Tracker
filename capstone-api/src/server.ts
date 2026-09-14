import cors from 'cors';
import dotenv from 'dotenv';
import express, { Router } from 'express';
import connectDb from './config/db';
import errorHandler from './middleware/errorHandler';
import authRouter from './routes/auth';
import claimsRouter from './routes/claims';
import dashboardRouter from './routes/dashboard';
import policiesRouter from './routes/policies';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: clientOrigin,
  })
);
app.use(express.json());

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/policies', policiesRouter);
apiRouter.use('/claims', claimsRouter);
apiRouter.use('/dashboard', dashboardRouter);

app.use('/api', apiRouter);

app.use(errorHandler);

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
