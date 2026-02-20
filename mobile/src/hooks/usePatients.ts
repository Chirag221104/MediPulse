import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, Patient } from '../services/patient.service';

export const usePatients = () => {
    return useQuery<Patient[]>({
        queryKey: ['patients'],
        queryFn: patientService.getAll,
    });
};

export const useCreatePatient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { name: string; age: number; gender: string; relation: string }) =>
            patientService.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
        },
    });
};

export const useDeletePatient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => patientService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
        },
    });
};
export const useUpdatePatient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<Patient> }) =>
            patientService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
        },
    });
};
