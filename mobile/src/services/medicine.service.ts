import api from './api';

export interface IntakeSlot {
    slot: 'morning' | 'afternoon' | 'evening';
    relation: 'before' | 'after' | 'with' | 'none';
}

export interface Medicine {
    _id: string;
    patientId: string;
    name: string;
    type: string;
    dose: string;
    unit: string;
    frequency: string;
    intakeSlots: IntakeSlot[];
    stock: number;
    startDate: string;
    instructions?: string;
    reminderTimes: string[];
    createdAt: string;
    updatedAt: string;
}

export const medicineService = {
    getByPatient: async (patientId: string): Promise<Medicine[]> => {
        const { data } = await api.get<{ success: boolean; data: Medicine[] }>('/medicines', {
            params: { patientId },
        });
        return data.data;
    },

    getById: async (id: string): Promise<Medicine> => {
        const { data } = await api.get<{ success: boolean; data: Medicine }>(`/medicines/${id}`);
        return data.data;
    },

    create: async (payload: {
        patientId: string;
        name: string;
        type: string;
        dose: string;
        unit: string;
        frequency: string;
        intakeSlots: IntakeSlot[];
        stock: number;
        startDate: string;
        reminderTimes: string[];
        instructions?: string;
    }): Promise<Medicine> => {
        const { data } = await api.post<{ success: boolean; data: Medicine }>('/medicines', payload);
        return data.data;
    },

    update: async (id: string, payload: Partial<Omit<Medicine, '_id' | 'patientId' | 'createdAt' | 'updatedAt'>>): Promise<Medicine> => {
        const { data } = await api.patch<{ success: boolean; data: Medicine }>(`/medicines/${id}`, payload);
        return data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/medicines/${id}`);
    },
};
