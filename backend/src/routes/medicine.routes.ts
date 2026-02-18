import { Router } from 'express';
import * as medicineController from '../controllers/medicine.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMedicineSchema, updateMedicineSchema, medicineIdSchema } from '../schema/medicine.schema';

const router = Router();

router.use(authenticate); // Protect all routes

router.post('/', validate(createMedicineSchema), medicineController.createMedicine);
router.get('/', medicineController.getMedicines); // ?patientId=...
router.get('/:id', validate(medicineIdSchema), medicineController.getMedicineById);
router.patch('/:id', validate(updateMedicineSchema), medicineController.updateMedicine);
router.delete('/:id', validate(medicineIdSchema), medicineController.deleteMedicine);

export default router;
