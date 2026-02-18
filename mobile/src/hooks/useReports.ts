import { useQuery } from '@tanstack/react-query';
import { reportService, AdherenceReport, HealthSummaryItem } from '../services/report.service';

export const useAdherence = (patientId: string | null, startDate: string, endDate: string) => {
    return useQuery<AdherenceReport>({
        queryKey: ['adherence', patientId, startDate, endDate],
        queryFn: () => reportService.getAdherence(patientId!, startDate, endDate),
        enabled: !!patientId,
    });
};

export const useHealthSummary = (patientId: string | null, startDate: string, endDate: string, type?: string) => {
    return useQuery<HealthSummaryItem[]>({
        queryKey: ['healthSummary', patientId, startDate, endDate, type],
        queryFn: () => reportService.getHealthSummary(patientId!, startDate, endDate, type),
        enabled: !!patientId,
    });
};
