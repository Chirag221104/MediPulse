import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../src/routes/auth.routes';
import patientRoutes from '../src/routes/patient.routes';
import { globalErrorHandler } from '../src/middleware/error';
import { correlationIdMiddleware } from '../src/middleware/correlation';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use(globalErrorHandler);

let mongoServer: MongoMemoryServer;
let accessToken: string;
let otherAccessToken: string;
let userId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register main user
    const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Patient Owner',
        email: 'owner@example.com',
        password: 'password123',
    });
    accessToken = res.body.data.accessToken;
    userId = res.body.data.user._id;

    // Register other user
    const res2 = await request(app).post('/api/v1/auth/register').send({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123',
    });
    otherAccessToken = res2.body.data.accessToken;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Patient Routes', () => {
    let patientId: string;

    it('should create a new patient', async () => {
        const res = await request(app)
            .post('/api/v1/patients')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'John Doe',
                age: 65,
                gender: 'male',
                relation: 'Father',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('John Doe');
        expect(res.body.data.userId).toBe(userId);
        patientId = res.body.data._id;
    });

    it('should get all patients for the user', async () => {
        const res = await request(app)
            .get('/api/v1/patients')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].name).toBe('John Doe');
    });

    it('should not let other user access patient', async () => {
        const res = await request(app)
            .get(`/api/v1/patients/${patientId}`)
            .set('Authorization', `Bearer ${otherAccessToken}`);

        expect(res.status).toBe(403);
    });

    it('should update patient', async () => {
        const res = await request(app)
            .patch(`/api/v1/patients/${patientId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                age: 66,
            });

        expect(res.status).toBe(200);
        expect(res.body.data.age).toBe(66);
    });

    it('should delete patient', async () => {
        const res = await request(app)
            .delete(`/api/v1/patients/${patientId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
    });

    it('should return 404 for deleted patient', async () => {
        const res = await request(app)
            .get(`/api/v1/patients/${patientId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
    });
});
