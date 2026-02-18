import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async () => {
    try {
        await mongoose.connect(env.MONGO_URI);
        logger.info(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        logger.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};
