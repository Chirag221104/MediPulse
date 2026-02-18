import { HealthLog, IHealthLog } from '../models/healthlog.model';

interface HealthLogFilter {
    patientId: string;
    type?: string;
    startDate?: string;
    endDate?: string;
}

export class HealthLogRepository {
    async create(data: Partial<IHealthLog>): Promise<IHealthLog> {
        return await HealthLog.create(data);
    }

    async find(filter: HealthLogFilter): Promise<IHealthLog[]> {
        const query: any = { patientId: filter.patientId };

        if (filter.type) {
            query.type = filter.type;
        }

        if (filter.startDate || filter.endDate) {
            query.recordedAt = {};
            if (filter.startDate) query.recordedAt.$gte = new Date(filter.startDate);
            if (filter.endDate) query.recordedAt.$lte = new Date(filter.endDate);
        }

        return await HealthLog.find(query).sort({ recordedAt: -1 });
    }
}
