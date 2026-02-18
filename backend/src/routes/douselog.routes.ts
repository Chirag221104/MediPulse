import { Router } from 'express';
import * as doseLogController from '../controllers/douselog.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createDoseLogSchema, getDoseLogsSchema } from '../schema/douselog.schema';

const router = Router();

router.use(authenticate); // Protect all routes

router.post('/', validate(createDoseLogSchema), doseLogController.logDose);
router.get('/', validate(getDoseLogsSchema), doseLogController.getDoseLogs);

export default router;
