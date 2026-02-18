import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let details = null;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errorCode = 'APP_ERROR';
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation Error';
        errorCode = 'VALIDATION_ERROR';
        details = err.issues;
    }

    logger.error(`${errorCode}: ${message}`, {
        correlationId: req.correlationId,
        stack: err.stack,
        details,
    });

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message,
            details,
        },
    });
};
