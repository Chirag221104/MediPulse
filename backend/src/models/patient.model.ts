import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatient extends Document {
    userId: Types.ObjectId;
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    relation: string;
    avatarUrl?: string;
    themeColor?: string;
    mealTimings: {
        breakfast: string;
        lunch: string;
        dinner: string;
    };
    alarmSettings: {
        leadTime: number;
        defaultBeforeOffset: number;
        defaultAfterOffset: number;
        snoozeMinutes: number;
        maxSnoozeCount: number;
        repeatMode: 'daily' | 'specific_days' | 'interval' | 'one_time';
        fullScreenEnabled: boolean;
        escalateIfMissed: boolean;
        gradualVolume: boolean;
        vibrationEnabled: boolean;
    };
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
        mealTimings: {
            breakfast: { type: String, default: '08:00' },
            lunch: { type: String, default: '13:00' },
            dinner: { type: String, default: '20:00' },
        },
        alarmSettings: {
            leadTime: { type: Number, default: 0 },
            defaultBeforeOffset: { type: Number, default: 15 },
            defaultAfterOffset: { type: Number, default: 15 },
            snoozeMinutes: { type: Number, default: 10 },
            maxSnoozeCount: { type: Number, default: 3 },
            repeatMode: { type: String, enum: ['daily', 'specific_days', 'interval', 'one_time'], default: 'daily' },
            fullScreenEnabled: { type: Boolean, default: true },
            escalateIfMissed: { type: Boolean, default: true },
            gradualVolume: { type: Boolean, default: true },
            vibrationEnabled: { type: Boolean, default: true },
        },
    },
    { timestamps: true }
);

export const Patient = mongoose.model<IPatient>('Patient', patientSchema);
