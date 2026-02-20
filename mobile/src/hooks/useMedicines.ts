import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicineService, Medicine } from '../services/medicine.service';
import { scheduleMedicineReminders, cancelMedicineReminders } from '../utils/notifications';

export const useMedicines = (patientId: string | null) => {
    return useQuery<Medicine[]>({
        queryKey: ['medicines', patientId],
        queryFn: () => medicineService.getByPatient(patientId!),
        enabled: !!patientId,
    });
};

export const useCreateMedicine = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: {
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
        }) => medicineService.create(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['medicines', data.patientId] });
            scheduleMedicineReminders(data);
        },
    });
};

export const useUpdateMedicine = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Medicine> }) =>
            medicineService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['medicines', data.patientId] });
            scheduleMedicineReminders(data);
        },
    });
};

export const useDeleteMedicine = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => medicineService.delete(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['medicines'] });
            cancelMedicineReminders(id);
        },
    });
};
