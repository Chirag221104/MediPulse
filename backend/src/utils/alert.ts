import { logger } from './logger';
import { IMedicine } from '../models/medicine.model';
import { Patient } from '../models/patient.model';
import { fcmService } from '../services/fcm.service';

export const triggerLowStockAlert = async (medicine: IMedicine) => {
    logger.warn(`LOW_STOCK_ALERT: Medicine "${medicine.name}" (ID: ${medicine._id}) is low on stock! Current: ${medicine.stock}, Threshold: ${medicine.lowStockThreshold}`);

    try {
        const patient = await Patient.findById(medicine.patientId);
        if (!patient) return;

        await fcmService.sendToUser(
            patient.userId.toString(),
            'Low Stock Alert! ⚠️',
            `You are low on ${medicine.name}. Only ${medicine.stock} ${medicine.dose.unit}(s) left.`,
            { medicineId: medicine._id.toString() }
        );
    } catch (error) {
        logger.error('Failed to trigger FCM low stock alert:', error);
    }
};
