import { Medicine, IMedicine } from '../models/medicine.model';

export class MedicineRepository {
    async create(data: Partial<IMedicine>): Promise<IMedicine> {
        const medicine = new Medicine(data);
        return await medicine.save();
    }

    async findByPatientId(patientId: string): Promise<IMedicine[]> {
        return await Medicine.find({ patientId }).sort({ createdAt: -1 });
    }

    async findById(id: string): Promise<IMedicine | null> {
        return await Medicine.findById(id);
    }

    async update(id: string, data: Partial<IMedicine>): Promise<IMedicine | null> {
        return await Medicine.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    }

    async delete(id: string): Promise<IMedicine | null> {
        return await Medicine.findByIdAndDelete(id);
    }
}
