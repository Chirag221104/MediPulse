import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../utils/AppError';

const authService = new AuthService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('Registering user:', req.body.email);
        const result = await authService.register(req.body);
        console.log('Registration success:', result.user.email);
        res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('Login attempt:', req.body.email);
        const result = await authService.login(req.body);
        console.log('Login success:', result.user.email);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshToken(refreshToken);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authService.logout(req.user.userId); // req.user set by auth middleware
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

export const registerFcmToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.body;
        if (!token) throw new AppError('Token is required', 400);

        await authService.registerFcmToken(req.user.userId, token);
        res.status(200).json({
            success: true,
            message: 'FCM token registered successfully',
        });
    } catch (error) {
        next(error);
    }
};
