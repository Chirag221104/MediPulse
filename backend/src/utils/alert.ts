import { logger } from './logger';
import { IMedicine } from '../models/medicine.model';

export const triggerLowStockAlert = (medicine: IMedicine) => {
    logger.warn(`LOW_STOCK_ALERT: Medicine "${medicine.name}" (ID: ${medicine._id}) is low on stock! Current: ${medicine.stock}, Threshold: ${medicine.lowStockThreshold}`);
    // In future: pushNotificationService.send(...)
};
