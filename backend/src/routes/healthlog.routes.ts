import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createHealthLogSchema, getHealthLogsSchema } from '../schema/healthlog.schema';
import * as healthLogController from '../controllers/healthlog.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate(createHealthLogSchema), healthLogController.createHealthLog);
router.get('/', validate(getHealthLogsSchema), healthLogController.getHealthLogs);

export default router;
