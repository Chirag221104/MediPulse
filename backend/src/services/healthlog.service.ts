import { HealthLogRepository } from '../repositories/healthlog.repository';
import { PatientRepository } from '../repositories/patient.repository';
import { IHealthLog } from '../models/healthlog.model';
import { AppError } from '../utils/AppError';

export class HealthLogService {
    private healthLogRepo: HealthLogRepository;
    private patientRepo: PatientRepository;

    constructor() {
        this.healthLogRepo = new HealthLogRepository();
        this.patientRepo = new PatientRepository();
    }

    async createLog(userId: string, data: Partial<IHealthLog>): Promise<IHealthLog> {
        // 1. Verify Patient Ownership
        const patient = await this.patientRepo.findById(data.patientId!.toString());
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }

        // 2. Create Log
        return await this.healthLogRepo.create(data);
    }

    async getLogs(userId: string, filter: { patientId: string; type?: string; startDate?: string; endDate?: string }): Promise<IHealthLog[]> {
        // 1. Verify Patient Ownership
        const patient = await this.patientRepo.findById(filter.patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }

        // 2. Fetch Logs
        return await this.healthLogRepo.find(filter);
    }
}

export const healthLogService = new HealthLogService();
