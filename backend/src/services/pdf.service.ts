import PDFDocument from 'pdfkit';
import { IPatient } from '../models/patient.model';

interface ReportData {
    patient: IPatient;
    adherenceData: any;
    healthData: any[];
    startDate: string;
    endDate: string;
}

export class PdfService {
    generatePatientReport({ patient, adherenceData, healthData, startDate, endDate }: ReportData): NodeJS.ReadableStream {
        const doc = new PDFDocument({ margin: 50 });

        // Header
        doc.fontSize(20).text('MediPulse Patient Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // Patient Details
        doc.fontSize(14).text('Patient Details', { underline: true });
        doc.fontSize(10).text(`Name: ${patient.name}`);
        doc.text(`Age: ${patient.age}`);
        doc.text(`Gender: ${patient.gender}`);
        doc.text(`Relation: ${patient.relation}`);
        doc.moveDown();
        doc.text(`Report Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
        doc.moveDown();
        doc.moveDown();

        // Adherence Summary
        doc.fontSize(14).text('Medication Adherence Summary', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Scheduled Doses: ${adherenceData.total}`);
        doc.text(`Taken: ${adherenceData.taken}`);
        doc.text(`Skipped: ${adherenceData.skipped}`);
        doc.text(`Missed: ${adherenceData.missed}`);

        const adherenceColor = adherenceData.adherencePercentage >= 80 ? 'green' : adherenceData.adherencePercentage >= 50 ? 'orange' : 'red';
        doc.fillColor(adherenceColor).text(`Adherence Rate: ${adherenceData.adherencePercentage.toFixed(1)}%`);
        doc.fillColor('black'); // Reset
        doc.moveDown();
        doc.moveDown();

        // Health Trends
        doc.fontSize(14).text('Health Vitals Summary', { underline: true });
        doc.moveDown();

        if (healthData.length === 0) {
            doc.fontSize(10).text('No health logs recorded for this period.');
        } else {
            // Simple Table Header
            const tableTop = doc.y;
            const itemHeight = 20;

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Type', 50, tableTop);
            doc.text('Count', 200, tableTop);
            doc.text('Avg', 300, tableTop);
            doc.text('Min', 400, tableTop);
            doc.text('Max', 500, tableTop);
            doc.font('Helvetica');

            let y = tableTop + itemHeight;

            healthData.forEach((item) => {
                doc.text(item.type.replace('_', ' ').toUpperCase(), 50, y);
                doc.text(item.count.toString(), 200, y);
                doc.text(`${item.avg}`, 300, y);
                doc.text(`${item.min}`, 400, y);
                doc.text(`${item.max}`, 500, y);
                y += itemHeight;
            });
        }

        doc.end();
        return doc;
    }
}

export const pdfService = new PdfService();
