import { Request, Response, NextFunction } from 'express';
import { DoseLogService } from '../services/douselog.service';

const doseLogService = new DoseLogService();

export const logDose = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await doseLogService.logDose(req.user.userId, req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getDoseLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId, startDate, endDate } = req.query;

        if (!patientId || typeof patientId !== 'string') {
            res.status(400).json({ success: false, message: 'Patient ID is required' });
            return;
        }

        // Convert query strings to Date objects if present (handled by Zod usually, but ensuring here if passed raw)
        const start = startDate ? new Date(startDate as string) : undefined;
        const end = endDate ? new Date(endDate as string) : undefined;

        const logs = await doseLogService.getDoseLogs(req.user.userId, patientId as string, start, end);
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};
