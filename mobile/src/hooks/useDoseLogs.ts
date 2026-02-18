import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doseLogService } from '../services/doselog.service';

export const useLogDose = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: {
            medicineId: string;
            patientId: string;
            status: 'taken' | 'skipped' | 'missed';
            slot: 'morning' | 'afternoon' | 'evening';
            scheduledFor: string;
            takenAt?: string;
        }) => doseLogService.log(payload),
        onSuccess: (_data, variables) => {
            // Invalidate medicines to reflect stock change
            queryClient.invalidateQueries({ queryKey: ['medicines', variables.patientId] });
        },
    });
};
