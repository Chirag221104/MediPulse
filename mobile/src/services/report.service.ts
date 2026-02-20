import api from './api';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

export interface AdherenceReport {
    total: number;
    taken: number;
    skipped: number;
    missed: number;
    adherencePercentage: number;
}

export interface HealthSummaryItem {
    type: string;
    count: number;
    min: number;
    max: number;
    avg: number;
}

export const reportService = {
    getAdherence: async (patientId: string, startDate: string, endDate: string): Promise<AdherenceReport> => {
        console.log('Fetching adherence for:', patientId);
        const { data } = await api.get<{ success: boolean; data: AdherenceReport }>('/reports/adherence', {
            params: { patientId, startDate, endDate },
        });
        console.log('Adherence data received');
        return data.data;
    },

    getHealthSummary: async (
        patientId: string,
        startDate: string,
        endDate: string,
        type?: string
    ): Promise<HealthSummaryItem[]> => {
        console.log('Fetching health summary for:', patientId);
        const { data } = await api.get<{ success: boolean; data: HealthSummaryItem[] }>('/reports/health-summary', {
            params: { patientId, startDate, endDate, ...(type ? { type } : {}) },
        });
        console.log('Health summary data received');
        return data.data;
    },

    downloadPdf: async (patientId: string, startDate: string, endDate: string, diseaseId?: string): Promise<void> => {
        const response = await api.get('/reports/pdf', {
            params: { patientId, startDate, endDate, ...(diseaseId ? { diseaseId } : {}) },
            responseType: 'arraybuffer',
        });

        // Convert arraybuffer to base64 for FileSystem
        const uint8 = new Uint8Array(response.data);
        let binary = '';
        uint8.forEach((byte) => { binary += String.fromCharCode(byte); });
        const base64 = btoa(binary);
        const fileUri = `${cacheDirectory}report-${Date.now()}.pdf`;

        await writeAsStringAsync(fileUri, base64, {
            encoding: EncodingType.Base64,
        });

        // Open share dialog
        if (await isAvailableAsync()) {
            await shareAsync(fileUri, {
                mimeType: 'application/pdf',
                dialogTitle: 'MediPulse Report',
            });
        }
    },
};
