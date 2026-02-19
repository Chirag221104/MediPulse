import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
});

const timeFormat = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

const scheduleSlotSchema = z.object({
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']),
    mealRelation: z.enum([
        'before_breakfast', 'after_breakfast',
        'before_lunch', 'after_lunch',
        'before_dinner', 'after_dinner'
    ]).optional(),
    quantity: z.number().min(0).optional(),
    reminderTime: timeFormat.optional(),
});

const doseSchema = z.object({
    strength: z.string().optional(),
    quantityPerDose: z.number().min(0.1, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
});

export const createMedicineSchema = z.object({
    body: z.object({
        patientId: objectIdSchema,
        diseaseId: objectIdSchema.optional(),
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler']),
        dose: doseSchema,
        schedule: z.object({
            slots: z.array(scheduleSlotSchema).min(1, 'At least one intake slot is required'),
        }),
        stock: z.number().int().min(0, 'Stock must be non-negative').optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        totalQuantityRequired: z.number().min(0).optional(),
        consumedQuantity: z.number().min(0).optional(),
        startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform(val => new Date(val)),
        endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().transform(val => val ? new Date(val) : undefined),
    }).superRefine((data, ctx) => {
        // 1. Duplicate timeOfDay check
        const slots = data.schedule.slots;
        const seen = new Set();
        for (const slot of slots) {
            if (seen.has(slot.timeOfDay)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate timeOfDay '${slot.timeOfDay}' not allowed`,
                    path: ['schedule', 'slots'],
                });
            }
            seen.add(slot.timeOfDay);
        }

        // 2. Type-aware unit validation
        const type = data.type;
        const unit = data.dose.unit.toLowerCase();

        const validUnits: Record<string, string[]> = {
            'Tablet': ['tablet', 'capsule'],
            'Syrup': ['ml'],
            'Drops': ['drops'],
            'Inhaler': ['puff'],
            'Injection': ['ml', 'iu'],
            'Cream': [] // Optional override or flexible
        };

        if (validUnits[type]?.length > 0 && !validUnits[type].includes(unit)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Unit '${unit}' is invalid for medicine type '${type}'. Expected one of: ${validUnits[type].join(', ')}`,
                path: ['dose', 'unit'],
            });
        }
    }),
});

export const updateMedicineSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        type: z.enum(['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler']).optional(),
        dose: doseSchema.partial().optional(),
        schedule: z.object({
            slots: z.array(scheduleSlotSchema).min(1),
        }).optional(),
        stock: z.number().int().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        diseaseId: objectIdSchema.optional(),
        totalQuantityRequired: z.number().min(0).optional(),
        consumedQuantity: z.number().min(0).optional(),
        startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().transform(val => val ? new Date(val) : undefined),
        endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().transform(val => val ? new Date(val) : undefined),
        isActive: z.boolean().optional(),
    }),
});

export const medicineIdSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});
