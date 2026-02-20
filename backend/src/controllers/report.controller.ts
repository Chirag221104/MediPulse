import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { pdfService } from '../services/pdf.service';
import { PatientRepository } from '../repositories/patient.repository';
import { Disease } from '../models/disease.model';
import { AppError } from '../utils/AppError';

const patientRepo = new PatientRepository();

export const getAdherenceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId, startDate, endDate, diseaseId } = req.query;
        const report = await reportService.getAdherenceReport(
            req.user.userId,
            patientId as string,
            startDate as string,
            endDate as string,
            diseaseId as string | undefined
        );
        res.status(200).json({ success: true, data: report });
    } catch (error) {
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
        const { patientId, startDate, endDate, diseaseId } = req.query;
        const userId = req.user.userId;
        const pId = patientId as string;
        const sDate = startDate as string;
        const eDate = endDate as string;
        const dId = diseaseId as string | undefined;

        // 1. Fetch Data (Parallel)
        const [patient, adherenceData, healthData, doseDetails] = await Promise.all([
            patientRepo.findById(pId),
            reportService.getAdherenceReport(userId, pId, sDate, eDate, dId),
            reportService.getHealthSummary(userId, pId, undefined, sDate, eDate),
            reportService.getDoseLogDetails(userId, pId, sDate, eDate, dId),
        ]);

        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        // Get disease name if filtered
        let diseaseName: string | undefined;
        if (dId) {
            const disease = await Disease.findById(dId).lean();
            diseaseName = disease?.name;
        }

        // 2. Generate PDF
        const stream = pdfService.generatePatientReport({
            patient,
            adherenceData,
            healthData,
            doseDetails,
            diseaseName,
            startDate: sDate,
            endDate: eDate
        });

        // 3. Set Headers
        const filename = diseaseName
            ? `report-${patient.name}-${diseaseName}-${Date.now()}.pdf`
            : `report-${patient.name}-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // 4. Pipe to response
        stream.pipe(res);

    } catch (error) {
        next(error);
    }
};
