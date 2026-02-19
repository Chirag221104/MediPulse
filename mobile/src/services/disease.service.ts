import api from './api';

export interface Disease {
    _id: string;
    patientId: string;
    name: string;
    type: 'normal' | 'regular';
    status: 'active' | 'completed' | 'paused';
    durationInDays?: number;
    startDate: string;
    endDate?: string;
    isActive: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export const diseaseService = {
    getByPatient: async (patientId: string): Promise<Disease[]> => {
        const { data } = await api.get<{ success: boolean; data: Disease[] }>('/diseases', {
            params: { patientId },
        });
        return data.data;
    },

    getById: async (id: string): Promise<Disease> => {
        const { data } = await api.get<{ success: boolean; data: Disease }>(`/diseases/${id}`);
        return data.data;
    },

    create: async (payload: Partial<Disease>): Promise<Disease> => {
        const { data } = await api.post<{ success: boolean; data: Disease }>('/diseases', payload);
        return data.data;
    },

    update: async (id: string, payload: Partial<Disease>): Promise<Disease> => {
        const { data } = await api.patch<{ success: boolean; data: Disease }>(`/diseases/${id}`, payload);
        return data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/diseases/${id}`);
    },

    migrate: async (): Promise<{ success: boolean }> => {
        const { data } = await api.post<{ success: boolean }>('/diseases/migrate');
        return data;
    },
};
