import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { pdfService } from '../services/pdf.service';
import { PatientRepository } from '../repositories/patient.repository';
import { AppError } from '../utils/AppError';

// Controller now needs access to PatientRepo to fetch name/age for PDF
const patientRepo = new PatientRepository();

export const getAdherenceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('Backend: GET /adherence for patient', req.query.patientId);
        const { patientId, startDate, endDate } = req.query;
        // Basic presence validation is handled by route validator or service defaults
        const report = await reportService.getAdherenceReport(
            req.user.userId,
            patientId as string,
            startDate as string,
            endDate as string
        );
        console.log('Backend: Returning adherence report');
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error('Backend Report Error:', error);
        next(error);
    }
};

export const getHealthSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId, type, startDate, endDate } = req.query;
        const summary = await reportService.getHealthSummary(
            req.user.userId,
            patientId as string,
            type as string | undefined,
            startDate as string,
            endDate as string
        );
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
};

export const downloadReportPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId, startDate, endDate } = req.query;
        const userId = req.user.userId;
        const pId = patientId as string;
        const sDate = startDate as string;
        const eDate = endDate as string;

        // 1. Fetch Data (Parallel)
        const [patient, adherenceData, healthData] = await Promise.all([
            patientRepo.findById(pId),
            reportService.getAdherenceReport(userId, pId, sDate, eDate),
            reportService.getHealthSummary(userId, pId, undefined, sDate, eDate) // All types
        ]);

        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        // 2. Generate PDF (Pass single object)
        const stream = pdfService.generatePatientReport({
            patient,
            adherenceData,
            healthData,
            startDate: sDate,
            endDate: eDate
        });

        // 3. Set Headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report-${patient.name}-${sDate}.pdf"`);

        // 4. Pipe to response
        stream.pipe(res);

    } catch (error) {
        next(error);
    }
};
