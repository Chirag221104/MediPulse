import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../src/routes/auth.routes';
import patientRoutes from '../src/routes/patient.routes';
import healthLogRoutes from '../src/routes/healthlog.routes';
import { globalErrorHandler } from '../src/middleware/error';
import { correlationIdMiddleware } from '../src/middleware/correlation';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/logs/health', healthLogRoutes);
app.use(globalErrorHandler);

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;
let accessToken: string = '';
let userId: string = '';
let patientId: string = '';

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // 1. Register User
    const authRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Health Log Test User',
        email: 'health@test.com',
        password: 'password123',
    });
    accessToken = authRes.body.data.accessToken;
    userId = authRes.body.data.user._id;

    // 2. Create Patient
    const patientRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            name: 'Health Patient',
            age: 65,
            gender: 'male',
            relation: 'Father',
        });
    patientId = patientRes.body.data._id;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Health Log Routes', () => {
    it('should create a health log', async () => {
        const res = await request(app)
            .post('/api/v1/logs/health')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                patientId: patientId,
                type: 'blood_pressure',
                value: 120,
                unit: 'mmHg',
                notes: 'Morning reading',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.type).toBe('blood_pressure');
        expect(res.body.data.value).toBe(120);
    });

    it('should get health logs filtered by type', async () => {
        // Create another log
        await request(app)
            .post('/api/v1/logs/health')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                patientId: patientId,
                type: 'heart_rate',
                value: 72,
                unit: 'bpm',
            });

        const res = await request(app)
            .get(`/api/v1/logs/health?patientId=${patientId}&type=blood_pressure`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].type).toBe('blood_pressure');
    });

    it('should filter by date range', async () => {
        // We have 2 logs created "now"
        const now = new Date();
        const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
        const future = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour future

        const res = await request(app)
            .get(`/api/v1/logs/health?patientId=${patientId}&startDate=${past.toISOString()}&endDate=${future.toISOString()}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent unauthorized access to other users patients', async () => {
        // Create another user
        const otherUserRes = await request(app).post('/api/v1/auth/register').send({
            name: 'Other User',
            email: 'other@test.com',
            password: 'password123',
        });
        const otherToken = otherUserRes.body.data.accessToken;

        // Try to create log for first user's patient
        const res = await request(app)
            .post('/api/v1/logs/health')
            .set('Authorization', `Bearer ${otherToken}`)
            .send({
                patientId: patientId, // Owned by first user
                type: 'weight',
                value: 70,
                unit: 'kg',
            });

        expect(res.status).toBe(403);
    });

    it('should validate input types', async () => {
        const res = await request(app)
            .post('/api/v1/logs/health')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                patientId: patientId,
                type: 'INVALID_TYPE',
                value: 120,
                unit: 'mmHg',
            });

        expect(res.status).toBe(400); // Validation Error
    });
});
