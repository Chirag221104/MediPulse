import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema<any>) => (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const parsed = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        // Assign parsed values back safely (req.query is read-only in newer Express)
        if (parsed.body) req.body = parsed.body;
        next();
    } catch (error) {
        next(error);
    }
};
