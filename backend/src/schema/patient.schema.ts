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
    }),
});

export const patientIdSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});
