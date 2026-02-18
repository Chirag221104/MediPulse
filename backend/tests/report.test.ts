import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../src/routes/auth.routes';
import patientRoutes from '../src/routes/patient.routes';
import medicineRoutes from '../src/routes/medicine.routes';
import doseLogRoutes from '../src/routes/douselog.routes';
import healthLogRoutes from '../src/routes/healthlog.routes';
import reportRoutes from '../src/routes/report.routes';
import { globalErrorHandler } from '../src/middleware/error';
import { correlationIdMiddleware } from '../src/middleware/correlation';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/logs/dose', doseLogRoutes);
app.use('/api/v1/logs/health', healthLogRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use(globalErrorHandler);

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;
let accessToken: string = '';
let userId: string = '';
let patientId: string = '';
let medicineId: string = '';

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // 1. Register User
    const authRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Report Test User',
        email: 'report@test.com',
        password: 'password123',
    });
    accessToken = authRes.body.data.accessToken;
    userId = authRes.body.data.user._id;

    // 2. Create Patient
    const patientRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            name: 'Report Patient',
            age: 70,
            gender: 'female',
            relation: 'Mother',
        });
    patientId = patientRes.body.data._id;

    // 3. Create Medicine (for dose logs)
    const medRes = await request(app)
        .post('/api/v1/medicines')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            patientId,
            name: 'Aspirin',
            dose: '100mg',
            type: 'Tablet',
            startDate: new Date().toISOString(),
            frequency: 'daily',
            instructions: 'Take with food',
            stock: 30,
            reminderTimes: ['08:00', '20:00'],
        });
    medicineId = medRes.body.data._id;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Report Routes', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    test('should calculate adherence correctly', async () => {
        // Seed Dose Logs
        // 1. Taken (Today)
        await request(app).post('/api/v1/logs/dose').set('Authorization', `Bearer ${accessToken}`).send({
            medicineId,
            patientId,
            status: 'taken',
            scheduledTime: today.toISOString(),
        });
        // 2. Skipped (Yesterday)
        await request(app).post('/api/v1/logs/dose').set('Authorization', `Bearer ${accessToken}`).send({
            medicineId,
            patientId,
            status: 'skipped',
            scheduledTime: yesterday.toISOString(),
        });
        // 3. Missed (2 days ago)
        await request(app).post('/api/v1/logs/dose').set('Authorization', `Bearer ${accessToken}`).send({
            medicineId,
            patientId,
            status: 'missed',
            scheduledTime: twoDaysAgo.toISOString(),
        });

        const res = await request(app)
            .get('/api/v1/reports/adherence')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({
                patientId,
                startDate: twoDaysAgo.toISOString(),
                endDate: new Date(today.getTime() + 1000 * 60 * 60 * 24).toISOString(), // Include today
            });

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBe(3);
        expect(res.body.data.taken).toBe(1);
        expect(res.body.data.skipped).toBe(1);
        expect(res.body.data.missed).toBe(1);
        // 1 taken / 3 total * 100 = 33.333...
        expect(res.body.data.adherencePercentage).toBeCloseTo(33.33, 1);
    });

    test('should calculate health summary correctly', async () => {
        // Seed Health Logs (Blood Pressure)
        await request(app).post('/api/v1/logs/health').set('Authorization', `Bearer ${accessToken}`).send({
            patientId,
            type: 'blood_pressure',
            value: 120,
            unit: 'mmHg',
            recordedAt: twoDaysAgo.toISOString(),
        });
        await request(app).post('/api/v1/logs/health').set('Authorization', `Bearer ${accessToken}`).send({
            patientId,
            type: 'blood_pressure',
            value: 130,
            unit: 'mmHg',
            recordedAt: yesterday.toISOString(),
        });
        await request(app).post('/api/v1/logs/health').set('Authorization', `Bearer ${accessToken}`).send({
            patientId,
            type: 'blood_pressure',
            value: 140, // Max
            unit: 'mmHg',
            recordedAt: today.toISOString(),
        });

        // Seed Health Log (Weight - should be ignored by filter)
        await request(app).post('/api/v1/logs/health').set('Authorization', `Bearer ${accessToken}`).send({
            patientId,
            type: 'weight',
            value: 70,
            unit: 'kg',
            recordedAt: today.toISOString(),
        });

        const res = await request(app)
            .get('/api/v1/reports/health-summary')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({
                patientId,
                type: 'blood_pressure',
                startDate: twoDaysAgo.toISOString(),
                endDate: new Date(today.getTime() + 1000 * 60 * 60 * 24).toISOString(),
            });

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        const bpStats = res.body.data[0];
        expect(bpStats.type).toBe('blood_pressure');
        expect(bpStats.count).toBe(3);
        expect(bpStats.min).toBe(120);
        expect(bpStats.max).toBe(140);
        expect(bpStats.avg).toBe(130);
    });

    test('should download PDF report', async () => {
        const res = await request(app)
            .get('/api/v1/reports/pdf')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({
                patientId,
                startDate: twoDaysAgo.toISOString(),
                endDate: new Date(today.getTime() + 1000 * 60 * 60 * 24).toISOString(),
            });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('application/pdf');
        expect(res.headers['content-disposition']).toContain('attachment');
        // Check if body is buffer
        expect(Buffer.isBuffer(res.body)).toBe(true);
    });

    test('should prevent unauthorized access to reports', async () => {
        const otherUserRes = await request(app).post('/api/v1/auth/register').send({
            name: 'Spy User',
            email: 'spy@test.com',
            password: 'password123',
        });
        const otherToken = otherUserRes.body.data.accessToken;

        const res = await request(app)
            .get('/api/v1/reports/adherence')
            .set('Authorization', `Bearer ${otherToken}`)
            .query({
                patientId,
                startDate: today.toISOString(),
                endDate: today.toISOString(),
            });

        expect(res.status).toBe(403);
    });
});
