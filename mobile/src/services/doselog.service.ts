import api from './api';

export interface DoseLog {
    _id: string;
    medicineId: string;
    patientId: string;
    status: 'taken' | 'skipped' | 'missed';
    slot: 'morning' | 'afternoon' | 'evening';
    scheduledFor: string; // ISO Date (normalized on backend)
    takenAt?: string;
    newStock?: number;
}

export const doseLogService = {
    log: async (payload: {
        medicineId: string;
        patientId: string;
        status: 'taken' | 'skipped' | 'missed';
        slot: 'morning' | 'afternoon' | 'evening';
        scheduledFor: string;
        takenAt?: string;
    }): Promise<DoseLog> => {
        const { data } = await api.post<{ success: boolean; data: DoseLog }>('/logs/dose', payload);
        return data.data;
    },

    getAll: async (patientId: string, startDate: string, endDate: string): Promise<DoseLog[]> => {
        const { data } = await api.get<{ success: boolean; data: DoseLog[] }>('/logs/dose', {
            params: { patientId, startDate, endDate },
        });
        return data.data;
    },
};
