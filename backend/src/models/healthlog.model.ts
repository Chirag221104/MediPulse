import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHealthLog extends Document {
    patientId: Types.ObjectId;
    type: 'blood_sugar' | 'blood_pressure' | 'weight' | 'heart_rate' | 'spo2';
    value: number;
    unit: string;
    notes?: string;
    recordedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const healthLogSchema = new Schema<IHealthLog>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
        type: {
            type: String,
            enum: ['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'spo2'],
            required: true,
        },
        value: { type: Number, required: true },
        unit: { type: String, required: true },
        notes: { type: String },
        recordedAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// Compound index for efficient querying by patient and date (Most common access pattern)
healthLogSchema.index({ patientId: 1, recordedAt: -1 });

export const HealthLog = mongoose.model<IHealthLog>('HealthLog', healthLogSchema);
