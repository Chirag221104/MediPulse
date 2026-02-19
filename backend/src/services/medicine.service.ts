import mongoose from 'mongoose';
import { MedicineRepository } from '../repositories/medicine.repository';
import { PatientRepository } from '../repositories/patient.repository';
import { IMedicine } from '../models/medicine.model';
import { AppError } from '../utils/AppError';

export class MedicineService {
    private medicineRepo: MedicineRepository;
    private patientRepo: PatientRepository;

    constructor() {
        this.medicineRepo = new MedicineRepository();
        this.patientRepo = new PatientRepository();
    }

    // Helper to verify patient ownership
    private async verifyPatientOwnership(userId: string, patientId: string) {
        const patient = await this.patientRepo.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }
        return patient;
    }

    async createMedicine(userId: string, data: Partial<IMedicine>) {
        if (!data.patientId) {
            throw new AppError('Patient ID is required', 400);
        }
        await this.verifyPatientOwnership(userId, data.patientId.toString());

        // Dynamic Calculation for 'normal' disease
        if (data.diseaseId) {
            const disease = await mongoose.model('Disease').findById(data.diseaseId);
            if (disease && disease.type === 'normal') {
                const slotsPerDay = data.schedule?.slots?.length || 0;
                const dosagePerSlot = data.dose?.quantityPerDose || 0;
                const duration = disease.durationInDays || 0;
                data.totalQuantityRequired = dosagePerSlot * slotsPerDay * duration;
                data.stock = undefined; // Force remove stock for normal
            }
        }

        return await this.medicineRepo.create(data);
    }

    async getMedicines(userId: string, patientId: string) {
        await this.verifyPatientOwnership(userId, patientId);
        // Only return active medicines
        return await this.medicineRepo.find({ patientId, isActive: true });
    }

    async getMedicineById(userId: string, medicineId: string) {
        const medicine = await this.medicineRepo.findById(medicineId);
        if (!medicine || !medicine.isActive) {
            throw new AppError('Medicine not found', 404);
        }
        await this.verifyPatientOwnership(userId, medicine.patientId.toString());
        return medicine;
    }

    async updateMedicine(userId: string, medicineId: string, data: Partial<IMedicine>) {
        const medicine = await this.getMedicineById(userId, medicineId);

        if (data.patientId && data.patientId.toString() !== medicine.patientId.toString()) {
            await this.verifyPatientOwnership(userId, data.patientId.toString());
        }

        // Recalculate if dosage/slots changed for 'normal' disease
        const diseaseId = data.diseaseId || medicine.diseaseId;
        if (diseaseId) {
            const disease = await mongoose.model('Disease').findById(diseaseId);
            if (disease && disease.type === 'normal') {
                const slotsPerDay = data.schedule?.slots?.length || medicine.schedule.slots.length;
                const dosagePerSlot = data.dose?.quantityPerDose || medicine.dose.quantityPerDose;
                const duration = disease.durationInDays || 0;
                data.totalQuantityRequired = dosagePerSlot * slotsPerDay * duration;
                data.stock = undefined;
            }
        }

        return await this.medicineRepo.update(medicineId, data);
    }

    async deleteMedicine(userId: string, medicineId: string) {
        await this.getMedicineById(userId, medicineId);
        // Soft delete
        return await this.medicineRepo.update(medicineId, { isActive: false });
    }
}
