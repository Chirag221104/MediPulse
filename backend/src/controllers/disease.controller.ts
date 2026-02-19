import { Request, Response, NextFunction } from 'express';
import { DiseaseService } from '../services/disease.service';

export class DiseaseController {
    private diseaseService: DiseaseService;

    constructor() {
        this.diseaseService = new DiseaseService();
    }

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const disease = await this.diseaseService.createDisease(userId, req.body);
            res.status(201).json({ success: true, data: disease });
        } catch (error) {
            next(error);
        }
    };

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const patientId = req.query.patientId as string;
            const diseases = await this.diseaseService.getDiseases(userId, patientId);
            res.status(200).json({ success: true, data: diseases });
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const disease = await this.diseaseService.getDiseaseById(userId, req.params.id as string);
            res.status(200).json({ success: true, data: disease });
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const disease = await this.diseaseService.updateDisease(userId, req.params.id as string, req.body);
            res.status(200).json({ success: true, data: disease });
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            await this.diseaseService.deleteDisease(userId, req.params.id as string);
            res.status(200).json({ success: true, message: 'Disease deleted successfully (soft-delete)' });
        } catch (error) {
            next(error);
        }
    };

    migrate = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user.userId;
            const result = await this.diseaseService.migrateExistingMedicines(userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
