import { PatientRepository } from '../repositories/patient.repository';
import { IPatient } from '../models/patient.model';
import { AppError } from '../utils/AppError';

export class PatientService {
    private patientRepo: PatientRepository;

    constructor() {
        this.patientRepo = new PatientRepository();
    }

    async createPatient(userId: string, data: Partial<IPatient>) {
        return await this.patientRepo.create({ ...data, userId: userId as any });
    }

    async getPatients(userId: string) {
        return await this.patientRepo.findByUserId(userId);
    }

    async getPatientById(userId: string, patientId: string) {
        const patient = await this.patientRepo.findById(patientId);
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        if (patient.userId.toString() !== userId) {
            throw new AppError('Unauthorized access to patient', 403);
        }
        return patient;
    }

    async updatePatient(userId: string, patientId: string, data: Partial<IPatient>) {
        const patient = await this.getPatientById(userId, patientId); // Check ownership
        return await this.patientRepo.update(patientId, data);
    }

    async deletePatient(userId: string, patientId: string) {
        await this.getPatientById(userId, patientId); // Check ownership
        return await this.patientRepo.delete(patientId);
    }
}
