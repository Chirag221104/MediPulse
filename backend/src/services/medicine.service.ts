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
        return await this.medicineRepo.create(data);
    }

    async getMedicines(userId: string, patientId: string) {
        await this.verifyPatientOwnership(userId, patientId);
        return await this.medicineRepo.findByPatientId(patientId);
    }

    async getMedicineById(userId: string, medicineId: string) {
        const medicine = await this.medicineRepo.findById(medicineId);
        if (!medicine) {
            throw new AppError('Medicine not found', 404);
        }
        // Implicitly checks if user owns the patient this medicine belongs to
        await this.verifyPatientOwnership(userId, medicine.patientId.toString());
        return medicine;
    }

    async updateMedicine(userId: string, medicineId: string, data: Partial<IMedicine>) {
        const medicine = await this.getMedicineById(userId, medicineId); // Check ownership

        // If patientId is being updated (rare, but possible), verify new patient ownership
        if (data.patientId && data.patientId.toString() !== medicine.patientId.toString()) {
            await this.verifyPatientOwnership(userId, data.patientId.toString());
        }

        return await this.medicineRepo.update(medicineId, data);
    }

    async deleteMedicine(userId: string, medicineId: string) {
        await this.getMedicineById(userId, medicineId); // Check ownership
        return await this.medicineRepo.delete(medicineId);
    }
}
