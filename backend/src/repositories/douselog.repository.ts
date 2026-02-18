import { DoseLog, IDoseLog } from '../models/douselog.model';

export class DoseLogRepository {
    async create(data: Partial<IDoseLog>): Promise<IDoseLog> {
        const log = new DoseLog(data);
        return await log.save();
    }

    async findByPatientIdAndDateRange(patientId: string, startDate?: Date, endDate?: Date): Promise<IDoseLog[]> {
        const query: any = { patientId };

        if (startDate || endDate) {
            query.scheduledFor = {};
            if (startDate) query.scheduledFor.$gte = startDate;
            if (endDate) query.scheduledFor.$lte = endDate;
        }

        return await DoseLog.find(query).sort({ scheduledFor: -1 });
    }

    async findById(id: string): Promise<IDoseLog | null> {
        return await DoseLog.findById(id);
    }
}
