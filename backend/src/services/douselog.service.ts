import { DoseLogRepository } from '../repositories/douselog.repository';
import { MedicineRepository } from '../repositories/medicine.repository';
import { PatientRepository } from '../repositories/patient.repository';
import { IDoseLog } from '../models/douselog.model';
import { AppError } from '../utils/AppError';
import { Medicine } from '../models/medicine.model';

export class DoseLogService {
    private doseLogRepo: DoseLogRepository;
    private medicineRepo: MedicineRepository;
    private patientRepo: PatientRepository;

    constructor() {
        this.doseLogRepo = new DoseLogRepository();
        this.medicineRepo = new MedicineRepository();
        this.patientRepo = new PatientRepository();
    }

    // Helper to verify ownership
    private async verifyOwnership(userId: string, medicineId: string) {
        const medicine = await this.medicineRepo.findById(medicineId);
        if (!medicine) {
            throw new AppError('Medicine not found', 404);
        }

        const patient = await this.patientRepo.findById(medicine.patientId.toString());
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }

        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient resource', 403);
        }

        return { medicine, patient };
    }

    async logDose(userId: string, data: Partial<IDoseLog>) {
        if (!data.medicineId || !data.status || !data.scheduledTime) {
            throw new AppError('Missing required fields', 400);
        }

        const { medicine } = await this.verifyOwnership(userId, data.medicineId.toString());

        let lowStock = false;

        // Atomic Stock Decrement if taken
        if (data.status === 'taken') {
            const updatedMedicine = await Medicine.findOneAndUpdate(
                { _id: data.medicineId, stock: { $gt: 0 } },
                { $inc: { stock: -1 } },
                { returnDocument: 'after' }
            );

            if (!updatedMedicine) {
                // Check if it was because of empty stock or invalid ID
                const currentMed = await this.medicineRepo.findById(data.medicineId.toString());
                if (currentMed && currentMed.stock === 0) {
                    throw new AppError('Cannot take dose: Stock is empty', 409); // Conflict
                }
                throw new AppError('Medicine update failed', 500);
            }

            // Check Low Stock Threshold
            if (updatedMedicine.stock <= updatedMedicine.lowStockThreshold) {
                lowStock = true;
                // Trigger Alert (Async, don't block response)
                import('../utils/alert').then(({ triggerLowStockAlert }) => {
                    triggerLowStockAlert(updatedMedicine);
                });
            }
        }

        try {
            const log = await this.doseLogRepo.create({
                ...data,
                patientId: medicine.patientId, // Ensure patientId comes from trusted source (medicine), not body
            });
            return { log, lowStock };
        } catch (error: any) {
            // Idempotency check: Duplicate key error
            // If duplicate key error (Idempotency)
            if (error.code === 11000) {
                // Revert stock if it was taken
                if (data.status === 'taken') {
                    await Medicine.findByIdAndUpdate(data.medicineId, { $inc: { stock: 1 } });
                }
                throw new AppError('Dose already logged for this scheduled time', 409);
            }

            // For any other error, revert stock
            if (data.status === 'taken') {
                await Medicine.findByIdAndUpdate(data.medicineId, { $inc: { stock: 1 } });
            }
            throw error;
        }
    }

    async getDoseLogs(userId: string, patientId: string, startDate?: Date, endDate?: Date) {
        // Verify user owns the patient
        const patient = await this.patientRepo.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }

        return await this.doseLogRepo.findByPatientIdAndDateRange(patientId, startDate, endDate);
    }
}
