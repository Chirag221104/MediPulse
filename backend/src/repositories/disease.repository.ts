import { Disease, IDisease } from '../models/disease.model';

export class DiseaseRepository {
    async create(data: Partial<IDisease>): Promise<IDisease> {
        const disease = new Disease(data);
        return await disease.save();
    }

    async findByPatientId(patientId: string): Promise<IDisease[]> {
        return await Disease.find({ patientId, isActive: true }).sort({ createdAt: -1 });
    }

    async findById(id: string): Promise<IDisease | null> {
        return await Disease.findOne({ _id: id, isActive: true });
    }

    async update(id: string, data: Partial<IDisease>): Promise<IDisease | null> {
        return await Disease.findOneAndUpdate(
            { _id: id, isActive: true },
            data,
            { returnDocument: 'after' }
        );
    }

    async delete(id: string): Promise<IDisease | null> {
        // Soft delete
        return await Disease.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
    }

    async findExpiredNormalDiseases(): Promise<IDisease[]> {
        const now = new Date();
        return await Disease.find({
            type: 'normal',
            status: 'active',
            endDate: { $lt: now },
            isActive: true
        });
    }
}
