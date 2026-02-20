import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { IUser } from '../models/user.model';
import crypto from 'crypto';

export class AuthService {
    private userRepo: UserRepository;

    constructor() {
        this.userRepo = new UserRepository();
    }

    async register(data: any) {
        const email = data.email.trim().toLowerCase();
        const existingUser = await this.userRepo.findByEmail(email);
        if (existingUser) {
            throw new AppError('Email already exists', 409);
        }

        const password = data.password.trim();
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.userRepo.create({ ...data, email, passwordHash });

        const { accessToken, refreshToken } = await this.generateTokens(user);

        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }

    async login(data: any) {
        const email = data.email.trim().toLowerCase();
        const password = data.password.trim();

        console.log(`[DEBUG] Login attempt for email: "${email}"`);
        const user = await this.userRepo.findByEmail(email);

        if (!user) {
            console.log(`[DEBUG] User not found for email: "${email}"`);
            throw new AppError('Invalid email or password', 401);
        }

        console.log(`[DEBUG] User found. Comparing passwords...`);
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log(`[DEBUG] Password match: ${isMatch}`);

        if (!isMatch) {
            throw new AppError('Invalid email or password', 401);
        }

        const { accessToken, refreshToken } = await this.generateTokens(user);

        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }

    async refreshToken(token: string) {
        try {
            const decoded: any = verifyRefreshToken(token);
            const user = await this.userRepo.findById(decoded.userId);

            if (!user || !user.refreshToken || user.refreshToken.tokenHash !== this.hashToken(token)) {
                throw new AppError('Invalid refresh token', 401);
            }

            // Rotate token
            const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user);
            return { accessToken, refreshToken: newRefreshToken };
        } catch (error) {
            throw new AppError('Invalid refresh token', 401);
        }
    }

    async logout(userId: string) {
        await this.userRepo.updateRefreshToken(userId, null);
    }

    async registerFcmToken(userId: string, token: string) {
        // Save token to user's tokens array if not already there
        await this.userRepo.update(userId, {
            $addToSet: { fcmTokens: token }
        } as any);
    }

    private async generateTokens(user: IUser) {
        const accessToken = signAccessToken({ userId: (user as any)._id, role: user.role });
        const refreshToken = signRefreshToken({ userId: (user as any)._id });

        // Hash refresh token before storing
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await this.userRepo.updateRefreshToken(user._id.toString(), tokenHash, expiresAt);

        return { accessToken, refreshToken };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private sanitizeUser(user: IUser) {
        const { passwordHash, refreshToken, ...userWithoutSensitive } = (user as any).toObject();
        return userWithoutSensitive;
    }
}
