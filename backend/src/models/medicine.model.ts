import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMedicine extends Document {
    patientId: Types.ObjectId;
    name: string;
    type: 'Tablet' | 'Syrup' | 'Injection' | 'Drops' | 'Cream' | 'Inhaler';
    dose: string;
    stock: number;
    lowStockThreshold: number;
    startDate: Date;
    endDate?: Date;
    frequency: 'daily' | 'weekly' | 'custom';
    reminderTimes: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
        name: { type: String, required: true },
        type: {
            type: String,
            enum: ['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler'],
            required: true,
        },
        dose: { type: String, required: true },
        stock: { type: Number, required: true, min: 0 },
        lowStockThreshold: { type: Number, default: 5 },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        frequency: { type: String, enum: ['daily', 'weekly', 'custom'], required: true },
        reminderTimes: { type: [String], required: true }, // Format: "HH:mm"
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
