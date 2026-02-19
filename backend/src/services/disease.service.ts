import { DiseaseRepository } from '../repositories/disease.repository';
import { MedicineRepository } from '../repositories/medicine.repository';
import { PatientRepository } from '../repositories/patient.repository';
import { IDisease } from '../models/disease.model';
import { AppError } from '../utils/AppError';
import { Types } from 'mongoose';

export class DiseaseService {
    private diseaseRepo: DiseaseRepository;
    private medicineRepo: MedicineRepository;
    private patientRepo: PatientRepository;

    constructor() {
        this.diseaseRepo = new DiseaseRepository();
        this.medicineRepo = new MedicineRepository();
        this.patientRepo = new PatientRepository();
    }

    private async verifyOwnership(userId: string, patientId: string) {
        const patient = await this.patientRepo.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }
        return patient;
    }

    async createDisease(userId: string, data: Partial<IDisease>) {
        if (!data.patientId) {
            throw new AppError('Patient ID is required', 400);
        }
        await this.verifyOwnership(userId, data.patientId.toString());
        return await this.diseaseRepo.create(data);
    }

    async getDiseases(userId: string, patientId: string) {
        await this.verifyOwnership(userId, patientId);
        return await this.diseaseRepo.findByPatientId(patientId);
    }

    async getDiseaseById(userId: string, diseaseId: string) {
        const disease = await this.diseaseRepo.findById(diseaseId);
        if (!disease) {
            throw new AppError('Disease not found', 404);
        }
        await this.verifyOwnership(userId, disease.patientId.toString());
        return disease;
    }

    async updateDisease(userId: string, diseaseId: string, data: Partial<IDisease>) {
        const disease = await this.getDiseaseById(userId, diseaseId);

        // Continuity Rule: If duration changes for 'normal', recalculate stock for courses
        if (disease.type === 'normal' && data.durationInDays && data.durationInDays !== disease.durationInDays) {
            const medicines = await this.medicineRepo.find({ diseaseId: disease._id, isActive: true });
            for (const med of medicines) {
                // newTotal = (dosagePerSlot * slotsPerDay) * newDuration
                const slotsPerDay = med.schedule.slots.length;
                const dosagePerSlot = med.dose.quantityPerDose;
                const newTotal = dosagePerSlot * slotsPerDay * data.durationInDays;

                await this.medicineRepo.update(med._id.toString(), {
                    totalQuantityRequired: newTotal,
                    // consumedQuantity is preserved automatically since we only update total
                });
            }
        }

        return await this.diseaseRepo.update(diseaseId, data);
    }

    async deleteDisease(userId: string, diseaseId: string) {
        const disease = await this.getDiseaseById(userId, diseaseId);

        // Soft delete disease
        await this.diseaseRepo.delete(diseaseId);

        // Soft delete related medicines
        const medicines = await this.medicineRepo.find({ diseaseId: disease._id, isActive: true });
        for (const med of medicines) {
            await this.medicineRepo.update(med._id.toString(), { isActive: false });
        }

        return { success: true };
    }

    /**
     * Logic to check and auto-complete courses based on time or dosage
     */
    async checkCourseCompletion(diseaseId: string) {
        const disease = await this.diseaseRepo.findById(diseaseId);
        if (!disease || disease.type !== 'normal' || disease.status !== 'active') return;

        const now = new Date();
        const medicines = await this.medicineRepo.find({ diseaseId: disease._id, isActive: true });

        const isTimeExpired = disease.endDate && now > disease.endDate;
        const isDosageFinished = medicines.length > 0 && medicines.every((m: any) => m.consumedQuantity >= (m.totalQuantityRequired || 0));

        if (isTimeExpired || isDosageFinished) {
            await this.diseaseRepo.update(disease._id.toString(), { status: 'completed' });
        }
    }

    /**
     * Migration logic: Group legacy standalone medicines under "Ongoing Treatments"
     */
    async migrateExistingMedicines(userId: string) {
        // Find all patients for this user
        const patients = await this.patientRepo.findByUserId(userId);

        for (const patient of patients) {
            const patientId = patient._id.toString();
            // Find medicines with no diseaseId
            const standaloneMedicines = await this.medicineRepo.find({
                patientId: patient._id,
                diseaseId: { $exists: false },
                isActive: true
            });

            if (standaloneMedicines.length > 0) {
                // Create synthetic "Ongoing Treatments" disease
                const disease = await this.diseaseRepo.create({
                    patientId: patient._id,
                    name: 'Ongoing Treatments',
                    type: 'regular',
                    status: 'active',
                    startDate: new Date(),
                    isActive: true
                });

                // Link medicines
                for (const med of standaloneMedicines) {
                    await this.medicineRepo.update(med._id.toString(), {
                        diseaseId: disease._id
                    });
                }
            }
        }
        return { success: true };
    }
}
