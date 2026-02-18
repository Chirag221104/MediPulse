import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../src/routes/auth.routes';
import patientRoutes from '../src/routes/patient.routes';
import medicineRoutes from '../src/routes/medicine.routes';
import doseLogRoutes from '../src/routes/douselog.routes';
import { globalErrorHandler } from '../src/middleware/error';
import { correlationIdMiddleware } from '../src/middleware/correlation';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/logs/dose', doseLogRoutes);
app.use(globalErrorHandler);

let mongoServer: MongoMemoryServer;
let accessToken: string;
let userId: string;
let patientId: string;
let medicineId: string;
const scheduledTime = '2023-10-01T08:00:00.000Z';

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register main user
    const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Dose User',
        email: 'dose@example.com',
        password: 'password123',
    });
    accessToken = res.body.data.accessToken;
    userId = res.body.data.user._id;

    // Create patient
    const patRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            name: 'Grandpa',
            age: 80,
            gender: 'male',
            relation: 'Grandfather',
        });
    patientId = patRes.body.data._id;

    // Create medicine (Stock: 2)
    const medRes = await request(app)
        .post('/api/v1/medicines')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            patientId: patientId,
            name: 'Aspirin',
            type: 'Tablet',
            dose: '100mg',
            stock: 2,
            lowStockThreshold: 0,
            frequency: 'daily',
            startDate: '2023-10-01',
            reminderTimes: ['08:00'],
        });
    medicineId = medRes.body.data._id;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Dose Log Routes', () => {
    it('should log a taken dose and DECREMENT stock', async () => {
        const res = await request(app)
            .post('/api/v1/logs/dose')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                medicineId: medicineId,
                status: 'taken',
                scheduledTime: scheduledTime,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.log).toBeDefined();
        expect(res.body.data.lowStock).toBe(false); // Stock went 2 -> 1 (Threshold 5? Wait default is 5)

        // Verify Stock (Should be 1)
        const medRes = await request(app)
            .get(`/api/v1/medicines/${medicineId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(medRes.body.data.stock).toBe(1);
    });

    it('should trigger LOW STOCK alert when stock drops below threshold', async () => {
        // Create medicine with Stock 2, Threshold 2
        const lowStockMedRes = await request(app)
            .post('/api/v1/medicines')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                patientId: patientId,
                name: 'Low Stock Med',
                type: 'Tablet',
                dose: '10mg',
                stock: 2,
                lowStockThreshold: 2,
                frequency: 'daily',
                startDate: '2023-10-01',
                reminderTimes: ['09:00'],
            });
        const lowMedId = lowStockMedRes.body.data._id;

        // Take dose (Stock 2 -> 1). 1 <= 2 is TRUE. Should trigger alert.
        const res = await request(app)
            .post('/api/v1/logs/dose')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                medicineId: lowMedId,
                status: 'taken',
                scheduledTime: '2023-10-01T09:00:00.000Z',
            });

        expect(res.status).toBe(201);
        expect(res.body.data.lowStock).toBe(true);
    });

    it('should PREVENT duplicate log (Idempotency)', async () => {
        const res = await request(app)
            .post('/api/v1/logs/dose')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                medicineId: medicineId,
                status: 'taken',
                scheduledTime: scheduledTime, // SAME time
            });

        expect(res.status).toBe(409); // Conflict
        expect(res.body.error.message).toContain('already logged');

        // Verify Stock (Should still be 1, not 0)
        const medRes = await request(app)
            .get(`/api/v1/medicines/${medicineId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(medRes.body.data.stock).toBe(1);
    });

    it('should log a SKIPPED dose and NOT decrement stock', async () => {
        const nextTime = '2023-10-02T08:00:00.000Z';
        const res = await request(app)
            .post('/api/v1/logs/dose')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                medicineId: medicineId,
                status: 'skipped',
                scheduledTime: nextTime,
            });

        expect(res.status).toBe(201);
        expect(res.body.data.lowStock).toBe(false);

        // Verify Stock (Should still be 1)
        const medRes = await request(app)
            .get(`/api/v1/medicines/${medicineId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(medRes.body.data.stock).toBe(1);
    });

    it('should PREVENT taking dose when stock is EMPTY', async () => {
        // Take the last pill (Stock 1 -> 0)
        await request(app).post('/api/v1/logs/dose').set('Authorization', `Bearer ${accessToken}`).send({
            medicineId: medicineId,
            status: 'taken',
            scheduledTime: '2023-10-03T08:00:00.000Z',
        });

        // Try to take another (Stock 0 -> Error)
        const res = await request(app)
            .post('/api/v1/logs/dose')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                medicineId: medicineId,
                status: 'taken',
                scheduledTime: '2023-10-04T08:00:00.000Z',
            });

        expect(res.status).toBe(409); // Conflict (Stock Empty)
        expect(res.body.error.message).toContain('Stock is empty');
    });

    it('should get dose logs filtered by patient', async () => {
        const res = await request(app)
            .get(`/api/v1/logs/dose?patientId=${patientId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(3); // 3 logs created above
    });
});
