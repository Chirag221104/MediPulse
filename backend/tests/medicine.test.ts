import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../src/routes/auth.routes';
import patientRoutes from '../src/routes/patient.routes';
import medicineRoutes from '../src/routes/medicine.routes';
import { globalErrorHandler } from '../src/middleware/error';
import { correlationIdMiddleware } from '../src/middleware/correlation';

const app = express();
app.use(express.json());
app.use(correlationIdMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use(globalErrorHandler);

let mongoServer: MongoMemoryServer;
let accessToken: string;
let otherAccessToken: string;
let userId: string;
let patientId: string;
let otherPatientId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register main user
    const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Medicine Owner',
        email: 'medowner@example.com',
        password: 'password123',
    });
    accessToken = res.body.data.accessToken;
    userId = res.body.data.user._id;

    // Register other user
    const res2 = await request(app).post('/api/v1/auth/register').send({
        name: 'Other User',
        email: 'otherinvader@example.com',
        password: 'password123',
    });
    otherAccessToken = res2.body.data.accessToken;

    // Create patient for main user
    const patRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
            name: 'Dad',
            age: 60,
            gender: 'male',
            relation: 'Father',
        });
    patientId = patRes.body.data._id;

    // Create patient for other user
    const otherPatRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
            name: 'Stranger',
            age: 30,
            gender: 'female',
            relation: 'Self',
        });
    otherPatientId = otherPatRes.body.data._id;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Medicine Routes', () => {
    let medicineId: string;

    it('should create a new medicine for own patient', async () => {
        const res = await request(app)
            .post('/api/v1/medicines')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                patientId: patientId,
                name: 'Paracetamol',
                type: 'Tablet',
                dose: '500mg',
                stock: 20,
                frequency: 'daily',
                startDate: '2023-10-01',
                reminderTimes: ['08:00', '20:00'],
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Paracetamol');
        medicineId = res.body.data._id;
    });

    it('should FAIL to create medicine for SOMEONE ELSE\'S patient', async () => {
        const res = await request(app)
            .post('/api/v1/medicines')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                patientId: otherPatientId, // Malicious attempt
                name: 'Poison',
                type: 'Tablet',
                dose: '100mg',
                stock: 10,
                frequency: 'daily',
                startDate: '2023-10-01',
                reminderTimes: ['08:00'],
            });

        expect(res.status).toBe(403); // Unauthorized access to patient
    });

    it('should get medicines for a patient', async () => {
        const res = await request(app)
            .get(`/api/v1/medicines?patientId=${patientId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('Paracetamol');
    });

    it('should update medicine', async () => {
        const res = await request(app)
            .patch(`/api/v1/medicines/${medicineId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                stock: 15,
            });

        expect(res.status).toBe(200);
        expect(res.body.data.stock).toBe(15);
    });

    it('should delete medicine', async () => {
        const res = await request(app)
            .delete(`/api/v1/medicines/${medicineId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
    });

    it('should return 404 for deleted medicine', async () => {
        const res = await request(app)
            .get(`/api/v1/medicines/${medicineId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
    });
});
