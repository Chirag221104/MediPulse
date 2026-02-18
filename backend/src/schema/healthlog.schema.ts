import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const createHealthLogSchema = z.object({
    body: z.object({
        patientId: objectIdSchema,
        type: z.enum(['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'spo2']),
        value: z.number(),
        unit: z.string().min(1, 'Unit is required'),
        notes: z.string().optional(),
        recordedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
    }),
});

export const getHealthLogsSchema = z.object({
    query: z.object({
        patientId: objectIdSchema,
        type: z.enum(['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'spo2']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});
