import { Types } from 'mongoose';
import { DoseLog } from '../models/douselog.model';
import { HealthLog } from '../models/healthlog.model';
import { PatientRepository } from '../repositories/patient.repository';
import { AppError } from '../utils/AppError';

export class ReportService {
    private patientRepo: PatientRepository;

    constructor() {
        this.patientRepo = new PatientRepository();
    }

    private async verifyOwnership(userId: string, patientId: string) {
        if (!Types.ObjectId.isValid(patientId)) {
            throw new AppError('Invalid Patient ID', 400);
        }
        const patient = await this.patientRepo.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }
    }

    async getAdherenceReport(userId: string, patientId: string, startDate: string, endDate: string) {
        await this.verifyOwnership(userId, patientId);

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Simple validation to ensure valid dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError('Invalid date format', 400);
        }

        const aggregation = await DoseLog.aggregate([
            {
                $match: {
                    patientId: new Types.ObjectId(patientId),
                    scheduledTime: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    taken: { $sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] } },
                    skipped: { $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] } },
                    missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    taken: 1,
                    skipped: 1,
                    missed: 1,
                    adherencePercentage: {
                        $cond: [
                            { $eq: ['$total', 0] },
                            0,
                            { $multiply: [{ $divide: ['$taken', '$total'] }, 100] },
                        ],
                    },
                },
            },
        ]);

        return aggregation[0] || { total: 0, taken: 0, skipped: 0, missed: 0, adherencePercentage: 0 };
    }

    async getHealthSummary(userId: string, patientId: string, type: string | undefined, startDate: string, endDate: string) {
        await this.verifyOwnership(userId, patientId);

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError('Invalid date format', 400);
        }

        const matchStage: any = {
            patientId: new Types.ObjectId(patientId),
            recordedAt: { $gte: start, $lte: end },
        };

        if (type) {
            matchStage.type = type;
        }

        const aggregation = await HealthLog.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    min: { $min: '$value' },
                    max: { $max: '$value' },
                    avg: { $avg: '$value' },
                },
            },
            {
                $project: {
                    _id: 0,
                    type: '$_id',
                    count: 1,
                    min: 1,
                    max: 1,
                    avg: { $round: ['$avg', 2] },
                },
            },
        ]);

        return aggregation;
    }
}

export const reportService = new ReportService();
