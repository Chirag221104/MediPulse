import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../src/routes/auth.routes';
import { globalErrorHandler } from '../src/middleware/error';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use(globalErrorHandler);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Auth Routes', () => {
    it('should register a new user', async () => {
        const res = await request(app).post('/api/v1/auth/register').send({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('test@example.com');
        expect(res.body.data.accessToken).toBeDefined();
    });

    it('should login a user', async () => {
        await request(app).post('/api/v1/auth/register').send({
            name: 'Login User',
            email: 'login@example.com',
            password: 'password123',
        });

        const res = await request(app).post('/api/v1/auth/login').send({
            email: 'login@example.com',
            password: 'password123',
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
    });
});
