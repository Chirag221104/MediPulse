import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IScheduleSlot {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    mealRelation?: 'before_breakfast' | 'after_breakfast' | 'before_lunch' | 'after_lunch' | 'before_dinner' | 'after_dinner';
    quantity?: number; // Override dose.quantityPerDose
    reminderTime?: string; // HH:mm
}

export interface IMedicine extends Document {
    patientId: Types.ObjectId;
    diseaseId?: Types.ObjectId;
    name: string;
    type: 'Tablet' | 'Syrup' | 'Injection' | 'Drops' | 'Cream' | 'Inhaler';
    dose: {
        strength?: string;
        quantityPerDose: number; // Global default
        unit: string;
    };
    schedule: {
        slots: IScheduleSlot[];
    };
    stock?: number;
    lowStockThreshold: number;
    totalQuantityRequired?: number;
    consumedQuantity: number;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const scheduleSlotSchema = new Schema({
    timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    mealRelation: {
        type: String,
        enum: [
            'before_breakfast', 'after_breakfast',
            'before_lunch', 'after_lunch',
            'before_dinner', 'after_dinner'
        ]
    },
    quantity: { type: Number, min: 0 },
    reminderTime: { type: String },
}, { _id: false });

const medicineSchema = new Schema<IMedicine>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
        diseaseId: { type: Schema.Types.ObjectId, ref: 'Disease', index: true },
        name: { type: String, required: true },
        type: {
            type: String,
            enum: ['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler'],
            required: true,
        },
        dose: {
            strength: { type: String },
            quantityPerDose: { type: Number, required: true, min: 0 },
            unit: { type: String, required: true },
        },
        schedule: {
            slots: { type: [scheduleSlotSchema], required: true },
        },
        // Stock logic for 'regular' chronic disease
        stock: {
            type: Number,
            min: 0,
            required: function (this: any) {
                // Required if standalone or regular disease
                return !this.diseaseId;
            }
        },
        lowStockThreshold: { type: Number, default: 5 },

        // Quota logic for 'normal' acute course
        totalQuantityRequired: { type: Number, min: 0 },
        consumedQuantity: { type: Number, default: 0, min: 0 },

        startDate: { type: Date, required: true },
        endDate: { type: Date },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Performance Indexes
medicineSchema.index({ diseaseId: 1, isActive: 1 });
medicineSchema.index({ patientId: 1, isActive: 1 });

// Note: Strict partitioning validation will be handled at the Service level 
// because we need to query the parent Disease to know its type.

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
