import api from './api';

export interface Patient {
    _id: string;
    userId: string;
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    relation: string;
    avatarUrl?: string;
    themeColor?: string;
    createdAt: string;
    updatedAt: string;
}

export const patientService = {
    getAll: async (): Promise<Patient[]> => {
        const { data } = await api.get<{ success: boolean; data: Patient[] }>('/patients');
        return data.data;
    },

    getById: async (id: string): Promise<Patient> => {
        const { data } = await api.get<{ success: boolean; data: Patient }>(`/patients/${id}`);
        return data.data;
    },

    create: async (payload: { name: string; age: number; gender: string; relation: string }): Promise<Patient> => {
        const { data } = await api.post<{ success: boolean; data: Patient }>('/patients', payload);
        return data.data;
    },

    update: async (id: string, payload: Partial<Patient>): Promise<Patient> => {
        const { data } = await api.patch<{ success: boolean; data: Patient }>(`/patients/${id}`, payload);
        return data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/patients/${id}`);
    },
};
