import api from './api';

export interface ScheduleSlot {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    mealRelation?: 'before_breakfast' | 'after_breakfast' | 'before_lunch' | 'after_lunch' | 'before_dinner' | 'after_dinner';
    quantity?: number;
    reminderTime?: string;
}

export interface Medicine {
    _id: string;
    patientId: string;
    diseaseId?: string;
    name: string;
    type: 'Tablet' | 'Syrup' | 'Injection' | 'Drops' | 'Cream' | 'Inhaler';
    dose: {
        strength?: string;
        quantityPerDose: number;
        unit: string;
    };
    schedule: {
        slots: ScheduleSlot[];
    };
    stock?: number;
    lowStockThreshold: number;
    totalQuantityRequired?: number;
    consumedQuantity: number;
    startDate: string;
    endDate?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export const medicineService = {
    // ... rest of the service methods remain the same but types are updated by the interface change
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
        diseaseId?: string;
        name: string;
        type: string;
        dose: Medicine['dose'];
        schedule: Medicine['schedule'];
        stock?: number;
        lowStockThreshold?: number;
        startDate: string;
        endDate?: string;
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
