import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: 'user' | 'admin' | 'caregiver';
    refreshToken?: {
        tokenHash: string;
        issuedAt: Date;
        expiresAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ['user', 'admin', 'caregiver'], default: 'user' },
        refreshToken: {
            tokenHash: { type: String },
            issuedAt: { type: Date },
            expiresAt: { type: Date },
        },
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
