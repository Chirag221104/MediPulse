import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDoseLog extends Document {
    medicineId: Types.ObjectId;
    patientId: Types.ObjectId;
    status: 'taken' | 'skipped' | 'missed';
    slot: 'morning' | 'afternoon' | 'evening';
    scheduledFor: Date; // Normalized to 00:00:00
    takenAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const doseLogSchema = new Schema<IDoseLog>(
    {
        medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
        patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
        status: {
            type: String,
            enum: ['taken', 'skipped', 'missed'],
            required: true,
        },
        slot: {
            type: String,
            enum: ['morning', 'afternoon', 'evening'],
            required: true,
        },
        scheduledFor: { type: Date, required: true },
        takenAt: { type: Date },
        notes: { type: String },
    },
    { timestamps: true }
);

// Idempotency: Prevent duplicate logs for the same scheduled dose (medicine + slot + date)
doseLogSchema.index({ medicineId: 1, slot: 1, scheduledFor: 1 }, { unique: true });

// efficient queries
doseLogSchema.index({ patientId: 1, scheduledFor: -1 });

export const DoseLog = mongoose.model<IDoseLog>('DoseLog', doseLogSchema);
