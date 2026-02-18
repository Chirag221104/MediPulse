import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIntakeSlot {
    slot: 'morning' | 'afternoon' | 'evening';
    relation: 'before' | 'after' | 'with' | 'none';
}

export interface IMedicine extends Document {
    patientId: Types.ObjectId;
    name: string;
    type: 'Tablet' | 'Syrup' | 'Injection' | 'Drops' | 'Cream' | 'Inhaler';
    dose: string;
    unit: string;
    stock: number;
    lowStockThreshold: number;
    startDate: Date;
    endDate?: Date;
    frequency: 'daily' | 'weekly' | 'custom';
    intakeSlots: IIntakeSlot[];
    reminderTimes: string[]; // Still keep for notifications, but derived from slots? Or keep as backup.
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const intakeSlotSchema = new Schema({
    slot: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    relation: { type: String, enum: ['before', 'after', 'with', 'none'], default: 'none' },
}, { _id: false });

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
        unit: { type: String, default: 'tablet' },
        stock: { type: Number, required: true, min: 0 },
        lowStockThreshold: { type: Number, default: 5 },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        frequency: { type: String, enum: ['daily', 'weekly', 'custom'], required: true },
        intakeSlots: { type: [intakeSlotSchema], required: true },
        reminderTimes: { type: [String], required: true }, // HH:mm
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
