import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatient extends Document {
    userId: Types.ObjectId;
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    relation: string;
    avatarUrl?: string;
    themeColor?: string;
    createdAt: Date;
    updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ['male', 'female', 'other'], required: true },
        relation: { type: String, required: true }, // e.g., "Father", "Self"
        avatarUrl: { type: String },
        themeColor: { type: String },
    },
    { timestamps: true }
);

export const Patient = mongoose.model<IPatient>('Patient', patientSchema);
