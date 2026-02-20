import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doseLogService, DoseLog } from '../services/doselog.service';

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
            // Invalidate medicines to reflect stock change and logs to reflect taking status
            queryClient.invalidateQueries({ queryKey: ['medicines', variables.patientId] });
            // Invalidate any "today" logs for this patient
            queryClient.invalidateQueries({ queryKey: ['doseLogs', 'today', variables.patientId] });
            // Invalidate reports so adherence stats update in real-time
            queryClient.invalidateQueries({ queryKey: ['adherence', variables.patientId] });
        },
    });
};

export const useTodayDoseLogs = (patientId?: string) => {
    const now = new Date();
    // Normalize to UTC midnight of the USER'S LOCAL current day
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dateStr = date.toISOString();

    return useQuery({
        queryKey: ['doseLogs', 'today', patientId, dateStr],
        queryFn: () => doseLogService.getAll(patientId!, dateStr, dateStr),
        enabled: !!patientId,
    });
};

export const useDoseLogs = (patientId: string | null, startDate: string, endDate: string) => {
    return useQuery<DoseLog[]>({
        queryKey: ['doseLogs', patientId, startDate, endDate],
        queryFn: () => doseLogService.getAll(patientId!, startDate, endDate),
        enabled: !!patientId,
    });
};
