import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthLogService, HealthLog } from '../services/healthlog.service';

export const useHealthLogs = (patientId: string | null, type?: string) => {
    return useQuery<HealthLog[]>({
        queryKey: ['healthLogs', patientId, type],
        queryFn: () => healthLogService.getAll(patientId!, type),
        enabled: !!patientId,
    });
};

export const useLogHealth = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: {
            patientId: string;
            type: string;
            value: number;
            unit: string;
            notes?: string;
            recordedAt?: string;
        }) => healthLogService.log(payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['healthLogs', variables.patientId] });
        },
    });
};
