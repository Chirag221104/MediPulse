import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicineService, Medicine } from '../services/medicine.service';

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
            name: string;
            type: string;
            dose: Medicine['dose'];
            schedule: Medicine['schedule'];
            stock: number;
            lowStockThreshold?: number;
            startDate: string;
            endDate?: string;
        }) => medicineService.create(payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['medicines', variables.patientId] });
        },
    });
};
