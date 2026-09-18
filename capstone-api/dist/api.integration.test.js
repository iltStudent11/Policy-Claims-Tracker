"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const mongodb_memory_server_1 = require("mongodb-memory-server");
const auth_1 = __importDefault(require("./routes/auth"));
const claims_1 = __importDefault(require("./routes/claims"));
const users_1 = __importDefault(require("./routes/users"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const Policy_1 = __importDefault(require("./models/Policy"));
const User_1 = __importDefault(require("./models/User"));
const createTestApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const apiRouter = (0, express_1.Router)();
    apiRouter.use('/auth', auth_1.default);
    apiRouter.use('/claims', claims_1.default);
    apiRouter.use('/users', users_1.default);
    app.use('/api', apiRouter);
    app.use(errorHandler_1.default);
    return app;
};
const buildEmail = () => `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
(0, vitest_1.describe)('API integration tests', () => {
    const app = createTestApp();
    let mongoServer;
    (0, vitest_1.beforeAll)(async () => {
        process.env.JWT_SECRET = 'vitest-jwt-secret';
        mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
        await mongoose_1.default.connect(mongoServer.getUri());
    });
    (0, vitest_1.beforeEach)(async () => {
        const collections = Object.values(mongoose_1.default.connection.collections);
        for (const collection of collections) {
            await collection.deleteMany({});
        }
    });
    (0, vitest_1.afterAll)(async () => {
        await mongoose_1.default.disconnect();
        await mongoServer.stop();
    });
    (0, vitest_1.it)('register returns a token', async () => {
        const response = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Test User',
            email: buildEmail(),
            password: 'Password123!',
            role: 'admin',
        });
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body.token).toEqual(vitest_1.expect.any(String));
        (0, vitest_1.expect)(response.body.user.email).toContain('@test.local');
    });
    (0, vitest_1.it)('register rejects names with numbers or special characters', async () => {
        const response = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Test User1!',
            email: buildEmail(),
            password: 'Password123!',
            role: 'adjuster',
        });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.message).toBe('name may only contain letters and spaces');
    });
    (0, vitest_1.it)('register rejects invalid email format without proper domain', async () => {
        const response = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Test User',
            email: 'invalid-email@domain',
            password: 'Password123!',
            role: 'adjuster',
        });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.message).toBe('email must be a valid email address');
    });
    (0, vitest_1.it)('login with wrong password returns 401', async () => {
        const email = buildEmail();
        await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Test User',
            email,
            password: 'Password123!',
            role: 'admin',
        });
        const response = await (0, supertest_1.default)(app).post('/api/auth/login').send({
            email,
            password: 'WrongPassword123!',
        });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.message).toBe('Invalid credentials');
    });
    (0, vitest_1.it)('login rejects invalid email format', async () => {
        const response = await (0, supertest_1.default)(app).post('/api/auth/login').send({
            email: 'invalid-email@domain',
            password: 'Password123!',
        });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.message).toBe('email must be a valid email address');
    });
    (0, vitest_1.it)('profile update succeeds with valid name and email', async () => {
        const registerResponse = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Test User',
            email: buildEmail(),
            password: 'Password123!',
            role: 'adjuster',
        });
        const token = registerResponse.body.token;
        const response = await (0, supertest_1.default)(app)
            .put('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'Updated Name',
            email: 'updated.name@test.com',
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.user.name).toBe('Updated Name');
        (0, vitest_1.expect)(response.body.user.email).toBe('updated.name@test.com');
    });
    (0, vitest_1.it)('profile update rejects invalid name and email format', async () => {
        const registerResponse = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Test User',
            email: buildEmail(),
            password: 'Password123!',
            role: 'adjuster',
        });
        const token = registerResponse.body.token;
        const invalidNameResponse = await (0, supertest_1.default)(app)
            .put('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'Invalid1!',
            email: 'valid@email.com',
        });
        (0, vitest_1.expect)(invalidNameResponse.status).toBe(400);
        (0, vitest_1.expect)(invalidNameResponse.body.message).toBe('name may only contain letters and spaces');
        const invalidEmailResponse = await (0, supertest_1.default)(app)
            .put('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'Valid Name',
            email: 'invalid-email@domain',
        });
        (0, vitest_1.expect)(invalidEmailResponse.status).toBe(400);
        (0, vitest_1.expect)(invalidEmailResponse.body.message).toBe('email must be a valid email address');
    });
    (0, vitest_1.it)('create a claim returns 201', async () => {
        const email = buildEmail();
        const registerResponse = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Claims Owner',
            email,
            password: 'Password123!',
            role: 'adjuster',
        });
        const token = registerResponse.body.token;
        const user = await User_1.default.findOne({ email });
        (0, vitest_1.expect)(user).not.toBeNull();
        const policy = await Policy_1.default.create({
            policyNumber: `POL-${Date.now()}`,
            holderName: 'Mia Roberts',
            type: 'auto',
            premium: 900,
            status: 'active',
            effectiveDate: new Date('2026-01-01'),
            expirationDate: new Date('2026-12-31'),
            owner: user._id,
        });
        const response = await (0, supertest_1.default)(app)
            .post('/api/claims')
            .set('Authorization', `Bearer ${token}`)
            .send({
            policy: policy.id,
            description: 'Rear-end collision damage',
            incidentDate: '2026-08-01',
            amount: 1250,
        });
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body.data.claimNumber).toMatch(/^CLM-/);
    });
    (0, vitest_1.it)('get claims without auth returns 401', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/claims');
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.message).toBe('Missing authorization token');
    });
    (0, vitest_1.it)('create claim with missing fields returns 400', async () => {
        const email = buildEmail();
        const registerResponse = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Claims Owner',
            email,
            password: 'Password123!',
            role: 'adjuster',
        });
        const token = registerResponse.body.token;
        const response = await (0, supertest_1.default)(app)
            .post('/api/claims')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.errors).toEqual(vitest_1.expect.any(Array));
    });
    (0, vitest_1.it)('only admins can create additional admin users', async () => {
        await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Initial Admin',
            email: buildEmail(),
            password: 'Password123!',
            role: 'admin',
        });
        const response = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Second Admin',
            email: buildEmail(),
            password: 'Password123!',
            role: 'admin',
        });
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.message).toBe('Only admins can create additional admin users.');
    });
    (0, vitest_1.it)('adjuster cannot update another adjuster\'s assigned claim', async () => {
        const ownerEmail = buildEmail();
        const otherAdjusterEmail = buildEmail();
        const ownerRegistration = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Owner Adjuster',
            email: ownerEmail,
            password: 'Password123!',
            role: 'adjuster',
        });
        const otherRegistration = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Other Adjuster',
            email: otherAdjusterEmail,
            password: 'Password123!',
            role: 'adjuster',
        });
        const ownerToken = ownerRegistration.body.token;
        const otherToken = otherRegistration.body.token;
        const owner = await User_1.default.findOne({ email: ownerEmail });
        (0, vitest_1.expect)(owner).not.toBeNull();
        const policy = await Policy_1.default.create({
            policyNumber: `POL-${Date.now()}`,
            holderName: 'Mia Roberts',
            type: 'auto',
            premium: 900,
            status: 'active',
            effectiveDate: new Date('2026-01-01'),
            expirationDate: new Date('2026-12-31'),
            owner: owner._id,
        });
        const createdClaimResponse = await (0, supertest_1.default)(app)
            .post('/api/claims')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
            policy: policy.id,
            description: 'Rear-end collision damage',
            incidentDate: '2026-08-01',
            amount: 1250,
        });
        const updateResponse = await (0, supertest_1.default)(app)
            .put(`/api/claims/${createdClaimResponse.body.data._id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ status: 'approved' });
        (0, vitest_1.expect)(updateResponse.status).toBe(403);
        (0, vitest_1.expect)(updateResponse.body.message).toBe('You are not allowed to modify this claim.');
    });
    (0, vitest_1.it)('claim delete is admin only', async () => {
        const adminEmail = buildEmail();
        const adjusterEmail = buildEmail();
        const adminRegistration = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Initial Admin',
            email: adminEmail,
            password: 'Password123!',
            role: 'admin',
        });
        const adjusterRegistration = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Claims Owner',
            email: adjusterEmail,
            password: 'Password123!',
            role: 'adjuster',
        });
        const adminToken = adminRegistration.body.token;
        const adjusterToken = adjusterRegistration.body.token;
        const adjuster = await User_1.default.findOne({ email: adjusterEmail });
        (0, vitest_1.expect)(adjuster).not.toBeNull();
        const policy = await Policy_1.default.create({
            policyNumber: `POL-${Date.now()}`,
            holderName: 'Mia Roberts',
            type: 'auto',
            premium: 900,
            status: 'active',
            effectiveDate: new Date('2026-01-01'),
            expirationDate: new Date('2026-12-31'),
            owner: adjuster._id,
        });
        const claimResponse = await (0, supertest_1.default)(app)
            .post('/api/claims')
            .set('Authorization', `Bearer ${adjusterToken}`)
            .send({
            policy: policy.id,
            description: 'Rear-end collision damage',
            incidentDate: '2026-08-01',
            amount: 1250,
        });
        const adjusterDelete = await (0, supertest_1.default)(app)
            .delete(`/api/claims/${claimResponse.body.data._id}`)
            .set('Authorization', `Bearer ${adjusterToken}`);
        (0, vitest_1.expect)(adjusterDelete.status).toBe(403);
        (0, vitest_1.expect)(adjusterDelete.body.message).toBe('Forbidden');
        const adminDelete = await (0, supertest_1.default)(app)
            .delete(`/api/claims/${claimResponse.body.data._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(adminDelete.status).toBe(200);
        (0, vitest_1.expect)(adminDelete.body.message).toBe('Claim deleted successfully');
    });
    (0, vitest_1.it)('admin can list, update, and delete other user accounts', async () => {
        const adminEmail = buildEmail();
        const adjusterEmail = buildEmail();
        const adminRegistration = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Avery Admin',
            email: adminEmail,
            password: 'Password123!',
            role: 'admin',
        });
        await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Taylor Adjuster',
            email: adjusterEmail,
            password: 'Password123!',
            role: 'adjuster',
        });
        const adminToken = adminRegistration.body.token;
        const adjuster = await User_1.default.findOne({ email: adjusterEmail });
        (0, vitest_1.expect)(adjuster).not.toBeNull();
        const listResponse = await (0, supertest_1.default)(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(listResponse.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(listResponse.body.users)).toBe(true);
        (0, vitest_1.expect)(listResponse.body.users.length).toBe(1);
        (0, vitest_1.expect)(listResponse.body.users[0].email).toBe(adjusterEmail);
        const updateResponse = await (0, supertest_1.default)(app)
            .put(`/api/users/${adjuster._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            name: 'Taylor Updated',
            email: adjusterEmail,
            role: 'admin',
        });
        (0, vitest_1.expect)(updateResponse.status).toBe(200);
        (0, vitest_1.expect)(updateResponse.body.user.name).toBe('Taylor Updated');
        (0, vitest_1.expect)(updateResponse.body.user.role).toBe('admin');
        const deleteResponse = await (0, supertest_1.default)(app)
            .delete(`/api/users/${adjuster._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(deleteResponse.status).toBe(200);
        (0, vitest_1.expect)(deleteResponse.body.message).toBe('User deleted successfully');
        const deletedUser = await User_1.default.findById(adjuster._id);
        (0, vitest_1.expect)(deletedUser).toBeNull();
    });
    (0, vitest_1.it)('non-admin cannot list user accounts', async () => {
        const adjusterRegistration = await (0, supertest_1.default)(app).post('/api/auth/register').send({
            name: 'Jordan Adjuster',
            email: buildEmail(),
            password: 'Password123!',
            role: 'adjuster',
        });
        const adjusterToken = adjusterRegistration.body.token;
        const response = await (0, supertest_1.default)(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adjusterToken}`);
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.message).toBe('Forbidden');
    });
});
