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
        if (!data.medicineId || !data.status || !data.slot || !data.scheduledFor) {
            throw new AppError('Missing required fields (medicineId, status, slot, scheduledFor)', 400);
        }

        const { medicine } = await this.verifyOwnership(userId, data.medicineId.toString());

        // Normalize Date to 00:00:00 for idempotency
        const scheduledFor = new Date(data.scheduledFor);
        scheduledFor.setHours(0, 0, 0, 0);

        // Calculate Stock Decrement based on slot override or global dose
        const slotConfig = medicine.schedule.slots.find(s => s.timeOfDay === data.slot);
        const decrement = slotConfig?.quantity !== undefined ? slotConfig.quantity : medicine.dose.quantityPerDose;

        let lowStock = false;

        // Atomic Stock Decrement if taken
        if (data.status === 'taken' && decrement > 0) {
            const updatedMedicine = await Medicine.findOneAndUpdate(
                { _id: data.medicineId, stock: { $gte: decrement } },
                { $inc: { stock: -decrement } },
                { returnDocument: 'after' }
            );

            if (!updatedMedicine) {
                const currentMed = await this.medicineRepo.findById(data.medicineId.toString());
                if (currentMed && currentMed.stock < decrement) {
                    throw new AppError(`Insufficient stock. Need ${decrement}, have ${currentMed.stock}`, 409);
                }
                throw new AppError('Medicine update failed', 500);
            }

            // Check Low Stock Threshold
            if (updatedMedicine.stock <= updatedMedicine.lowStockThreshold) {
                lowStock = true;
                import('../utils/alert').then(({ triggerLowStockAlert }) => {
                    triggerLowStockAlert(updatedMedicine);
                });
            }
        }

        try {
            const log = await this.doseLogRepo.create({
                ...data,
                scheduledFor, // Use normalized date
                patientId: medicine.patientId,
            });
            return { log, lowStock };
        } catch (error: any) {
            // Idempotency: Revert stock if taken
            if (data.status === 'taken' && decrement > 0) {
                await Medicine.findByIdAndUpdate(data.medicineId, { $inc: { stock: decrement } });
            }

            if (error.code === 11000) {
                throw new AppError(`Dose already logged for ${data.slot} on ${scheduledFor.toDateString()}`, 409);
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
