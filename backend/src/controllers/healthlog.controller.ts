import { Request, Response, NextFunction } from 'express';
import { healthLogService } from '../services/healthlog.service';

export const createHealthLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const log = await healthLogService.createLog(req.user.userId, req.body);
        res.status(201).json({ success: true, data: log });
    } catch (error) {
        next(error);
    }
};

export const getHealthLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filter = {
            patientId: req.query.patientId as string,
            type: req.query.type as string,
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
        };
        const logs = await healthLogService.getLogs(req.user.userId, filter);
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};
