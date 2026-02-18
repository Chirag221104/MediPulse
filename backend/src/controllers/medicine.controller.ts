import { Request, Response, NextFunction } from 'express';
import { MedicineService } from '../services/medicine.service';

const medicineService = new MedicineService();

export const createMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const medicine = await medicineService.createMedicine(req.user.userId, req.body);
        res.status(201).json({ success: true, data: medicine });
    } catch (error) {
        next(error);
    }
};

export const getMedicines = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId } = req.query;
        if (!patientId || typeof patientId !== 'string') {
            res.status(400).json({ success: false, message: 'Patient ID is required' });
            return;
        }
        const medicines = await medicineService.getMedicines(req.user.userId, patientId as string);
        res.status(200).json({ success: true, data: medicines });
    } catch (error) {
        next(error);
    }
};

export const getMedicineById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const medicine = await medicineService.getMedicineById(req.user.userId, req.params.id as string);
        res.status(200).json({ success: true, data: medicine });
    } catch (error) {
        next(error);
    }
};

export const updateMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const medicine = await medicineService.updateMedicine(req.user.userId, req.params.id as string, req.body);
        res.status(200).json({ success: true, data: medicine });
    } catch (error) {
        next(error);
    }
};

export const deleteMedicine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await medicineService.deleteMedicine(req.user.userId, req.params.id as string);
        res.status(200).json({ success: true, message: 'Medicine deleted successfully' });
    } catch (error) {
        next(error);
    }
};
