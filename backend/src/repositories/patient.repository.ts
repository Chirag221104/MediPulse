import { Patient, IPatient } from '../models/patient.model';

export class PatientRepository {
    async create(data: Partial<IPatient>): Promise<IPatient> {
        const patient = new Patient(data);
        return await patient.save();
    }

    async findByUserId(userId: string): Promise<IPatient[]> {
        return await Patient.find({ userId }).sort({ createdAt: -1 });
    }

    async findById(id: string): Promise<IPatient | null> {
        return await Patient.findById(id);
    }

    async update(id: string, data: Partial<IPatient>): Promise<IPatient | null> {
        return await Patient.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    }

    async delete(id: string): Promise<IPatient | null> {
        return await Patient.findByIdAndDelete(id);
    }

    async countByUserId(userId: string): Promise<number> {
        return await Patient.countDocuments({ userId });
    }
}
