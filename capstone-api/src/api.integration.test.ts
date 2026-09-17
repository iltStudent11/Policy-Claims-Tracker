import express, { Router } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRouter from './routes/auth';
import claimsRouter from './routes/claims';
import errorHandler from './middleware/errorHandler';
import PolicyModel from './models/Policy';
import UserModel from './models/User';

const createTestApp = () => {
  const app = express();

  app.use(express.json());

  const apiRouter = Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/claims', claimsRouter);

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
};

const buildEmail = () => `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;

describe('API integration tests', () => {
  const app = createTestApp();
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'vitest-jwt-secret';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    const collections = Object.values(mongoose.connection.collections);
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('register returns a token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: buildEmail(),
      password: 'Password123!',
      role: 'admin',
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toContain('@test.local');
  });

  it('login with wrong password returns 401', async () => {
    const email = buildEmail();

    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email,
      password: 'Password123!',
      role: 'admin',
    });

    const response = await request(app).post('/api/auth/login').send({
      email,
      password: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('create a claim returns 201', async () => {
    const email = buildEmail();

    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Claims Owner',
      email,
      password: 'Password123!',
      role: 'adjuster',
    });

    const token = registerResponse.body.token as string;
    const user = await UserModel.findOne({ email });

    expect(user).not.toBeNull();

    const policy = await PolicyModel.create({
      policyNumber: `POL-${Date.now()}`,
      holderName: 'Mia Roberts',
      type: 'auto',
      premium: 900,
      status: 'active',
      effectiveDate: new Date('2026-01-01'),
      expirationDate: new Date('2026-12-31'),
      owner: user!._id,
    });

    const response = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({
        policy: policy.id,
        description: 'Rear-end collision damage',
        incidentDate: '2026-08-01',
        amount: 1250,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.claimNumber).toMatch(/^CLM-/);
  });

  it('get claims without auth returns 401', async () => {
    const response = await request(app).get('/api/claims');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Missing authorization token');
  });

  it('create claim with missing fields returns 400', async () => {
    const email = buildEmail();

    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Claims Owner',
      email,
      password: 'Password123!',
      role: 'adjuster',
    });

    const token = registerResponse.body.token as string;

    const response = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(expect.any(Array));
  });
});
