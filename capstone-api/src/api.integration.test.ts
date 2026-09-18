import express, { Router } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRouter from './routes/auth';
import claimsRouter from './routes/claims';
import policiesRouter from './routes/policies';
import usersRouter from './routes/users';
import errorHandler from './middleware/errorHandler';
import PolicyModel from './models/Policy';
import UserModel from './models/User';

const createTestApp = () => {
  const app = express();

  app.use(express.json());

  const apiRouter = Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/policies', policiesRouter);
  apiRouter.use('/claims', claimsRouter);
  apiRouter.use('/users', usersRouter);

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

  it('register rejects names with numbers or special characters', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test User1!',
      email: buildEmail(),
      password: 'Password123!',
      role: 'adjuster',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('name may only contain letters and spaces');
  });

  it('register rejects invalid email format without proper domain', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'invalid-email@domain',
      password: 'Password123!',
      role: 'adjuster',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('email must be a valid email address');
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

  it('login rejects invalid email format', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid-email@domain',
      password: 'Password123!',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('email must be a valid email address');
  });

  it('profile update succeeds with valid name and email', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: buildEmail(),
      password: 'Password123!',
      role: 'adjuster',
    });

    const token = registerResponse.body.token as string;

    const response = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        email: 'updated.name@test.com',
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe('Updated Name');
    expect(response.body.user.email).toBe('updated.name@test.com');
  });

  it('profile update rejects invalid name and email format', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: buildEmail(),
      password: 'Password123!',
      role: 'adjuster',
    });

    const token = registerResponse.body.token as string;

    const invalidNameResponse = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Invalid1!',
        email: 'valid@email.com',
      });

    expect(invalidNameResponse.status).toBe(400);
    expect(invalidNameResponse.body.message).toBe('name may only contain letters and spaces');

    const invalidEmailResponse = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Valid Name',
        email: 'invalid-email@domain',
      });

    expect(invalidEmailResponse.status).toBe(400);
    expect(invalidEmailResponse.body.message).toBe('email must be a valid email address');
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

  it('delete policy returns 204 with no content', async () => {
    const adminEmail = buildEmail();

    const adminRegistration = await request(app).post('/api/auth/register').send({
      name: 'Policy Admin',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin',
    });

    const adminToken = adminRegistration.body.token as string;

    const createPolicyResponse = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        policyNumber: `POL-${Date.now()}`,
        holderName: 'Morgan Policyholder',
        type: 'auto',
        premium: 1100,
        status: 'active',
        effectiveDate: '2026-01-01',
        expirationDate: '2026-12-31',
      });

    expect(createPolicyResponse.status).toBe(201);

    const deletePolicyResponse = await request(app)
      .delete(`/api/policies/${createPolicyResponse.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deletePolicyResponse.status).toBe(204);
    expect(deletePolicyResponse.text).toBe('');
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

  it('only admins can create additional admin users', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Initial Admin',
      email: buildEmail(),
      password: 'Password123!',
      role: 'admin',
    });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Second Admin',
      email: buildEmail(),
      password: 'Password123!',
      role: 'admin',
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Only admins can create additional admin users.');
  });

  it('adjuster cannot update another adjuster\'s assigned claim', async () => {
    const ownerEmail = buildEmail();
    const otherAdjusterEmail = buildEmail();

    const ownerRegistration = await request(app).post('/api/auth/register').send({
      name: 'Owner Adjuster',
      email: ownerEmail,
      password: 'Password123!',
      role: 'adjuster',
    });

    const otherRegistration = await request(app).post('/api/auth/register').send({
      name: 'Other Adjuster',
      email: otherAdjusterEmail,
      password: 'Password123!',
      role: 'adjuster',
    });

    const ownerToken = ownerRegistration.body.token as string;
    const otherToken = otherRegistration.body.token as string;
    const owner = await UserModel.findOne({ email: ownerEmail });

    expect(owner).not.toBeNull();

    const policy = await PolicyModel.create({
      policyNumber: `POL-${Date.now()}`,
      holderName: 'Mia Roberts',
      type: 'auto',
      premium: 900,
      status: 'active',
      effectiveDate: new Date('2026-01-01'),
      expirationDate: new Date('2026-12-31'),
      owner: owner!._id,
    });

    const createdClaimResponse = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        policy: policy.id,
        description: 'Rear-end collision damage',
        incidentDate: '2026-08-01',
        amount: 1250,
      });

    const updateResponse = await request(app)
      .put(`/api/claims/${createdClaimResponse.body.data._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'approved' });

    expect(updateResponse.status).toBe(403);
    expect(updateResponse.body.message).toBe('You are not allowed to modify this claim.');
  });

  it('claim delete is admin only', async () => {
    const adminEmail = buildEmail();
    const adjusterEmail = buildEmail();

    const adminRegistration = await request(app).post('/api/auth/register').send({
      name: 'Initial Admin',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin',
    });

    const adjusterRegistration = await request(app).post('/api/auth/register').send({
      name: 'Claims Owner',
      email: adjusterEmail,
      password: 'Password123!',
      role: 'adjuster',
    });

    const adminToken = adminRegistration.body.token as string;
    const adjusterToken = adjusterRegistration.body.token as string;
    const adjuster = await UserModel.findOne({ email: adjusterEmail });

    expect(adjuster).not.toBeNull();

    const policy = await PolicyModel.create({
      policyNumber: `POL-${Date.now()}`,
      holderName: 'Mia Roberts',
      type: 'auto',
      premium: 900,
      status: 'active',
      effectiveDate: new Date('2026-01-01'),
      expirationDate: new Date('2026-12-31'),
      owner: adjuster!._id,
    });

    const claimResponse = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${adjusterToken}`)
      .send({
        policy: policy.id,
        description: 'Rear-end collision damage',
        incidentDate: '2026-08-01',
        amount: 1250,
      });

    const adjusterDelete = await request(app)
      .delete(`/api/claims/${claimResponse.body.data._id}`)
      .set('Authorization', `Bearer ${adjusterToken}`);

    expect(adjusterDelete.status).toBe(403);
    expect(adjusterDelete.body.message).toBe('Forbidden');

    const adminDelete = await request(app)
      .delete(`/api/claims/${claimResponse.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDelete.status).toBe(204);
    expect(adminDelete.text).toBe('');
  });

  it('admin can list, update, and delete other user accounts', async () => {
    const adminEmail = buildEmail();
    const adjusterEmail = buildEmail();

    const adminRegistration = await request(app).post('/api/auth/register').send({
      name: 'Avery Admin',
      email: adminEmail,
      password: 'Password123!',
      role: 'admin',
    });

    await request(app).post('/api/auth/register').send({
      name: 'Taylor Adjuster',
      email: adjusterEmail,
      password: 'Password123!',
      role: 'adjuster',
    });

    const adminToken = adminRegistration.body.token as string;
    const adjuster = await UserModel.findOne({ email: adjusterEmail });

    expect(adjuster).not.toBeNull();

    const listResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.users)).toBe(true);
    expect(listResponse.body.users.length).toBe(1);
    expect(listResponse.body.users[0].email).toBe(adjusterEmail);

    const updateResponse = await request(app)
      .put(`/api/users/${adjuster!._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Taylor Updated',
        email: adjusterEmail,
        role: 'admin',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user.name).toBe('Taylor Updated');
    expect(updateResponse.body.user.role).toBe('admin');

    const deleteResponse = await request(app)
      .delete(`/api/users/${adjuster!._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.text).toBe('');

    const deletedUser = await UserModel.findById(adjuster!._id);
    expect(deletedUser).toBeNull();
  });

  it('non-admin cannot list user accounts', async () => {
    const adjusterRegistration = await request(app).post('/api/auth/register').send({
      name: 'Jordan Adjuster',
      email: buildEmail(),
      password: 'Password123!',
      role: 'adjuster',
    });

    const adjusterToken = adjusterRegistration.body.token as string;

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adjusterToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Forbidden');
  });
});
