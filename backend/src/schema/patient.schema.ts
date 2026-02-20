import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
});

export const createPatientSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        age: z.number().int().positive('Age must be a positive integer'),
        gender: z.enum(['male', 'female', 'other']),
        relation: z.string().min(1, 'Relation is required'),
        avatarUrl: z.string().url().optional(),
        themeColor: z.string().optional(),
        mealTimings: z.object({
            breakfast: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)'),
            lunch: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)'),
            dinner: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)'),
        }).optional(),
    }),
});

export const updatePatientSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        age: z.number().int().positive().optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        relation: z.string().min(1).optional(),
        avatarUrl: z.string().url().optional(),
        themeColor: z.string().optional(),
        mealTimings: z.object({
            breakfast: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)').optional(),
            lunch: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)').optional(),
            dinner: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)').optional(),
        }).optional(),
    }),
});

export const patientIdSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});
