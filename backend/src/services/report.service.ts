import { Types } from 'mongoose';
import { DoseLog } from '../models/douselog.model';
import { HealthLog } from '../models/healthlog.model';
import { Medicine } from '../models/medicine.model';
import { Disease } from '../models/disease.model';
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

    /** Get medicine IDs filtered by disease (if provided) */
    private async getMedicineIdFilter(patientId: string, diseaseId?: string): Promise<Types.ObjectId[] | null> {
        if (!diseaseId) return null; // No filter
        const medicines = await Medicine.find({
            patientId: new Types.ObjectId(patientId),
            diseaseId: new Types.ObjectId(diseaseId),
        }).select('_id').lean();
        return medicines.map(m => m._id as Types.ObjectId);
    }

    async getAdherenceReport(userId: string, patientId: string, startDate: string, endDate: string, diseaseId?: string) {
        await this.verifyOwnership(userId, patientId);

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError('Invalid date format', 400);
        }

        const matchStage: any = {
            patientId: new Types.ObjectId(patientId),
            scheduledFor: { $gte: start, $lte: end },
        };

        // Filter by disease's medicines if diseaseId is provided
        const medicineIds = await this.getMedicineIdFilter(patientId, diseaseId);
        if (medicineIds) {
            matchStage.medicineId = { $in: medicineIds };
        }

        const aggregation = await DoseLog.aggregate([
            { $match: matchStage },
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

    /** Detailed dose log entries for the PDF report */
    async getDoseLogDetails(userId: string, patientId: string, startDate: string, endDate: string, diseaseId?: string) {
        await this.verifyOwnership(userId, patientId);

        const start = new Date(startDate);
        const end = new Date(endDate);

        const query: any = {
            patientId: new Types.ObjectId(patientId),
            scheduledFor: { $gte: start, $lte: end },
        };

        const medicineIds = await this.getMedicineIdFilter(patientId, diseaseId);
        if (medicineIds) {
            query.medicineId = { $in: medicineIds };
        }

        const logs = await DoseLog.find(query).sort({ scheduledFor: -1, slot: 1 }).lean();

        // Fetch medicine names in bulk
        const logMedIds = [...new Set(logs.map(l => l.medicineId.toString()))];
        const medicines = await Medicine.find({ _id: { $in: logMedIds } }).lean();
        const medMap = new Map(medicines.map(m => [m._id.toString(), m.name]));

        return logs.map(log => ({
            date: log.scheduledFor,
            slot: log.slot,
            medicineName: medMap.get(log.medicineId.toString()) || 'Unknown',
            status: log.status,
            takenAt: log.takenAt || null,
        }));
    }

    /** Get all diseases for a patient (for the report picker) */
    async getPatientDiseases(userId: string, patientId: string) {
        await this.verifyOwnership(userId, patientId);
        const diseases = await Disease.find({
            patientId: new Types.ObjectId(patientId),
        }).select('_id name status type startDate endDate').sort({ startDate: -1 }).lean();
        return diseases;
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
