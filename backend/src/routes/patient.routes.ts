import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPatientSchema, updatePatientSchema, patientIdSchema } from '../schema/patient.schema';

const router = Router();

router.use(authenticate); // Protect all routes

router.post('/', validate(createPatientSchema), patientController.createPatient);
router.get('/', patientController.getPatients);
router.get('/:id', validate(patientIdSchema), patientController.getPatientById);
router.patch('/:id', validate(updatePatientSchema), patientController.updatePatient);
router.delete('/:id', validate(patientIdSchema), patientController.deletePatient);

export default router;
