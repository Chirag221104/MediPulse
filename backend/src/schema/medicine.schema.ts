import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
});

const timeFormat = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

export const createMedicineSchema = z.object({
    body: z.object({
        patientId: objectIdSchema,
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler']),
        dose: z.string().min(1, 'Dose is required'),
        unit: z.string().optional(),
        stock: z.number().int().min(0, 'Stock must be non-negative'),
        lowStockThreshold: z.number().int().min(0).optional(),
        startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform(val => new Date(val)),
        endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().transform(val => val ? new Date(val) : undefined),
        frequency: z.enum(['daily', 'weekly', 'custom']),
        intakeSlots: z.array(z.object({
            slot: z.enum(['morning', 'afternoon', 'evening']),
            relation: z.enum(['before', 'after', 'with', 'none']),
        })).min(1, 'At least one intake slot is required'),
        reminderTimes: z.array(timeFormat).min(1, 'At least one reminder time is required'),
    }),
});

export const updateMedicineSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        type: z.enum(['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler']).optional(),
        dose: z.string().min(1).optional(),
        unit: z.string().optional(),
        stock: z.number().int().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().transform(val => val ? new Date(val) : undefined),
        frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
        intakeSlots: z.array(z.object({
            slot: z.enum(['morning', 'afternoon', 'evening']),
            relation: z.enum(['before', 'after', 'with', 'none']),
        })).min(1).optional(),
        reminderTimes: z.array(timeFormat).min(1).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const medicineIdSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});
