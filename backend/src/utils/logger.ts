import winston from 'winston';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.correlationId || 'SYSTEM'}] ${info.level}: ${info.message}`
    )
);

const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    format
);

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: consoleFormat
    }),
];

// Add file logging only if we are not in production or if explicitly enabled
// Containers usually stream to stdout, and the host handles persistence
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format // No colorize for file logs
        }),
        new winston.transports.File({
            filename: 'logs/all.log',
            format
        })
    );
}

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    levels,
    format,
    transports,
});
