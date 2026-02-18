import api from './api';

export interface HealthLog {
    _id: string;
    patientId: string;
    type: 'blood_sugar' | 'blood_pressure' | 'weight' | 'heart_rate' | 'spo2';
    value: number;
    unit: string;
    notes?: string;
    recordedAt: string;
}

export const healthLogService = {
    log: async (payload: {
        patientId: string;
        type: string;
        value: number;
        unit: string;
        notes?: string;
        recordedAt?: string;
    }): Promise<HealthLog> => {
        const { data } = await api.post<{ success: boolean; data: HealthLog }>('/logs/health', payload);
        return data.data;
    },

    getAll: async (patientId: string, type?: string): Promise<HealthLog[]> => {
        const { data } = await api.get<{ success: boolean; data: HealthLog[] }>('/logs/health', {
            params: { patientId, ...(type ? { type } : {}) },
        });
        return data.data;
    },
};
