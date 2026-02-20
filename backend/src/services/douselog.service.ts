import mongoose from 'mongoose';
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

        // Disease Guard
        let diseaseType: 'normal' | 'regular' = 'regular';
        if (medicine.diseaseId) {
            const disease = await mongoose.model('Disease').findOne({ _id: medicine.diseaseId, isActive: true });
            if (!disease) {
                throw new AppError('Linked disease not found', 404);
            }
            if (disease.status !== 'active') {
                throw new AppError(`Cannot log dose. Treatment course is ${disease.status}`, 403);
            }
            diseaseType = disease.type;
        }

        // Normalize Date to 00:00:00 UTC for idempotency
        const scheduledFor = new Date(data.scheduledFor);
        scheduledFor.setUTCHours(0, 0, 0, 0);

        // Calculate Dose Quantity
        const slotConfig = medicine.schedule.slots.find(s => s.timeOfDay === data.slot);
        const doseQuantity = slotConfig?.quantity !== undefined ? slotConfig.quantity : medicine.dose.quantityPerDose;

        let lowStock = false;

        // Atomic Update if taken
        if (data.status === 'taken' && doseQuantity > 0) {
            if (diseaseType === 'normal') {
                // For acute courses: Increment consumedQuantity
                await Medicine.findByIdAndUpdate(data.medicineId, {
                    $inc: { consumedQuantity: doseQuantity }
                });

                // Check if this completes the course (optional: could be a hook)
                // We'll let the next GET request or a background check handle status flip to keep logging fast
            } else {
                // For chronic/standalone: Decrement stock
                const updatedMedicine = await Medicine.findOneAndUpdate(
                    { _id: data.medicineId, stock: { $gte: doseQuantity } },
                    { $inc: { stock: -doseQuantity } },
                    { returnDocument: 'after' }
                );

                if (!updatedMedicine) {
                    const currentMed = await this.medicineRepo.findById(data.medicineId.toString());
                    if (currentMed && (currentMed.stock || 0) < doseQuantity) {
                        throw new AppError(`Insufficient stock. Need ${doseQuantity}, have ${currentMed.stock || 0}`, 409);
                    }
                    throw new AppError('Medicine update failed', 500);
                }

                // Check Low Stock Threshold
                if (updatedMedicine.stock !== undefined && updatedMedicine.stock <= updatedMedicine.lowStockThreshold) {
                    lowStock = true;
                    import('../utils/alert').then(({ triggerLowStockAlert }) => {
                        triggerLowStockAlert(updatedMedicine);
                    });
                }
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
            // Idempotency: Revert if taken
            if (data.status === 'taken' && doseQuantity > 0) {
                if (diseaseType === 'normal') {
                    await Medicine.findByIdAndUpdate(data.medicineId, { $inc: { consumedQuantity: -doseQuantity } });
                } else {
                    await Medicine.findByIdAndUpdate(data.medicineId, { $inc: { stock: doseQuantity } });
                }
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
