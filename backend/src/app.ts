import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { connectDB } from './config/db';
import { globalErrorHandler } from './middleware/error';
import { correlationIdMiddleware } from './middleware/correlation';
import { logger } from './utils/logger';

// Sync uncaught exception handler
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
    process.exit(1);
});

const app = express();

// Security Middleware
if (process.env.NODE_ENV === 'production') {
    app.enable('trust proxy');
}
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);

// Body Parsers (Size Limit 10kb)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(compression());

// Logging
app.use(correlationIdMiddleware);
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Health Check
import mongoose from 'mongoose';
app.get('/health', (_req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    const status = dbStatus === 'UP' ? 200 : 503;
    res.status(status).json({
        status: dbStatus === 'UP' ? 'UP' : 'DOWN',
        timestamp: new Date(),
        db: dbStatus,
        details: {
            connections: mongoose.connections.length,
            readyState: mongoose.connection.readyState
        }
    });
});

// Routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import medicineRoutes from './routes/medicine.routes';
import doseLogRoutes from './routes/douselog.routes';
import healthLogRoutes from './routes/healthlog.routes';

import reportRoutes from './routes/report.routes';

// ... imports

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/logs/dose', doseLogRoutes);
app.use('/api/v1/logs/health', healthLogRoutes);
app.use('/api/v1/reports', reportRoutes); // Register Report Routes

// Global Error Handler
app.use(globalErrorHandler);

// Start Server
// Start Server
let server: any;
console.log('Current NODE_ENV:', process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(env.PORT, async () => {
        await connectDB();
        logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
}

export default app;

// Async error handler
process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});
