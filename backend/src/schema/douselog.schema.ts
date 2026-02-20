import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
});

export const createDoseLogSchema = z.object({
    body: z.object({
        medicineId: objectIdSchema,
        patientId: objectIdSchema.optional(), // Sent by frontend, used for refetching
        status: z.enum(['taken', 'skipped', 'missed']),
        slot: z.enum(['morning', 'afternoon', 'evening']),
        scheduledFor: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)).transform(val => new Date(val)),
        takenAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        notes: z.string().optional(),
    }),
});

export const getDoseLogsSchema = z.object({
    query: z.object({
        patientId: objectIdSchema,
        startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    }),
});
