import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDisease extends Document {
    patientId: Types.ObjectId;
    name: string;
    type: 'normal' | 'regular';
    status: 'active' | 'completed' | 'paused';
    durationInDays?: number; // Only for 'normal'
    startDate: Date;
    endDate?: Date; // Only for 'normal'
    notes?: string;
    isActive: boolean; // Soft delete
    createdAt: Date;
    updatedAt: Date;
}

const diseaseSchema = new Schema<IDisease>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['normal', 'regular'],
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'paused'],
            default: 'active',
            index: true,
        },
        durationInDays: {
            type: Number,
            required: function (this: IDisease) {
                return this.type === 'normal';
            },
        },
        startDate: { type: Date, required: true, default: Date.now },
        endDate: { type: Date },
        notes: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Performance Indexes
diseaseSchema.index({ patientId: 1, isActive: 1 });
diseaseSchema.index({ type: 1 });

// Middleware to auto-calculate endDate for 'normal' courses
diseaseSchema.pre('save', async function () {
    if (this.type === 'normal' && this.durationInDays && this.startDate) {
        const end = new Date(this.startDate);
        end.setDate(end.getDate() + this.durationInDays);
        this.endDate = end;
    }
});

export const Disease = mongoose.model<IDisease>('Disease', diseaseSchema);
