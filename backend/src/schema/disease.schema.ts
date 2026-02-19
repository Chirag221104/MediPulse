import { z } from 'zod';

export const createDiseaseSchema = z.object({
    body: z.object({
        patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Patient ID'),
        name: z.string().min(1, 'Name is required').trim(),
        type: z.enum(['normal', 'regular']),
        status: z.enum(['active', 'completed', 'paused']).optional(),
        durationInDays: z.number().int().positive().optional(),
        startDate: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
    }).refine((data) => {
        if (data.type === 'normal' && !data.durationInDays) {
            return false;
        }
        return true;
    }, {
        message: 'Duration is required for normal treatment courses',
        path: ['durationInDays'],
    }),
});

export const updateDiseaseSchema = z.object({
    body: z.object({
        name: z.string().min(1).trim().optional(),
        status: z.enum(['active', 'completed', 'paused']).optional(),
        durationInDays: z.number().int().positive().optional(),
        startDate: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
    }),
});
