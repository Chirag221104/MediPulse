import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getAdherenceReport, getHealthSummary, downloadReportPdf } from '../controllers/report.controller';
import { z } from 'zod';

const router = Router();

const reportQuerySchema = z.object({
    query: z.object({
        patientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        type: z.enum(['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'spo2']).optional(),
    }),
});

// All report routes require authentication
router.use(authenticate);

router.get('/adherence', validate(reportQuerySchema), getAdherenceReport);
router.get('/health-summary', validate(reportQuerySchema), getHealthSummary);
router.get('/pdf', validate(reportQuerySchema), downloadReportPdf);

export default router;
