import PDFDocument from 'pdfkit';
import { IPatient } from '../models/patient.model';

interface DoseDetail {
    date: Date;
    slot: string;
    medicineName: string;
    status: string;
    takenAt: Date | null;
}

interface ReportData {
    patient: IPatient;
    adherenceData: any;
    healthData: any[];
    doseDetails: DoseDetail[];
    diseaseName?: string;
    startDate: string;
    endDate: string;
}

export class PdfService {
    generatePatientReport({ patient, adherenceData, healthData, doseDetails, diseaseName, startDate, endDate }: ReportData): NodeJS.ReadableStream {
        const doc = new PDFDocument({ margin: 50 });

        // Header
        const title = diseaseName
            ? `MediPulse Report — ${diseaseName}`
            : 'MediPulse Patient Report (Full)';
        doc.fontSize(20).text(title, { align: 'center' });
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

        // ──────────── Health Vitals Summary ────────────
        doc.fontSize(14).text('Health Vitals Summary', { underline: true });
        doc.moveDown();

        if (healthData.length === 0) {
            doc.fontSize(10).text('No health logs recorded for this period.');
        } else {
            healthData.forEach((item) => {
                doc.fontSize(11).font('Helvetica-Bold').text(item.type.replace('_', ' ').toUpperCase());
                doc.font('Helvetica').fontSize(10);
                doc.text(`Count: ${item.count}  |  Avg: ${item.avg}  |  Min: ${item.min}  |  Max: ${item.max}`);
                doc.moveDown(0.5);
            });
        }

        doc.moveDown();

        // ──────────── Detailed Dose Log History ────────────
        doc.fontSize(14).text('Dose Log History', { underline: true });
        doc.moveDown();

        if (!doseDetails || doseDetails.length === 0) {
            doc.fontSize(10).text('No dose logs recorded for this period.');
        } else {
            // Table header
            const colX = { date: 50, medicine: 140, slot: 310, status: 390, time: 460 };
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Date', colX.date, doc.y);
            const headerY = doc.y - 11;
            doc.text('Medicine', colX.medicine, headerY);
            doc.text('Slot', colX.slot, headerY);
            doc.text('Status', colX.status, headerY);
            doc.text('Time', colX.time, headerY);
            doc.font('Helvetica');
            doc.moveDown(0.5);

            // Draw a line under header
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.3);

            doseDetails.forEach((entry) => {
                // Check if we need a new page
                if (doc.y > 700) {
                    doc.addPage();
                }

                const rowY = doc.y;
                const dateStr = new Date(entry.date).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
                const timeStr = entry.takenAt
                    ? new Date(entry.takenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '-';

                const statusColor = entry.status === 'taken' ? 'green' : entry.status === 'skipped' ? 'orange' : 'red';

                doc.fontSize(9);
                doc.fillColor('black').text(dateStr, colX.date, rowY, { width: 85 });
                doc.fillColor('black').text(entry.medicineName, colX.medicine, rowY, { width: 165 });
                doc.fillColor('black').text(entry.slot.charAt(0).toUpperCase() + entry.slot.slice(1), colX.slot, rowY, { width: 70 });
                doc.fillColor(statusColor).text(entry.status.toUpperCase(), colX.status, rowY, { width: 60 });
                doc.fillColor('black').text(timeStr, colX.time, rowY, { width: 80 });
                doc.moveDown(0.3);
            });
        }

        doc.fillColor('black');
        doc.end();
        return doc;
    }
}

export const pdfService = new PdfService();
