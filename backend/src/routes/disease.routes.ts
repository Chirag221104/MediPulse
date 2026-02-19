import { Router } from 'express';
import { DiseaseController } from '../controllers/disease.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createDiseaseSchema, updateDiseaseSchema } from '../schema/disease.schema';

const router = Router();
const controller = new DiseaseController();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createDiseaseSchema), controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.patch('/:id', validate(updateDiseaseSchema), controller.update);
router.delete('/:id', controller.delete);
router.post('/migrate', controller.migrate);

export default router;
