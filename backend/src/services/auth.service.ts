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
        const existingUser = await this.userRepo.findByEmail(data.email);
        if (existingUser) {
            throw new AppError('Email already exists', 409);
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await this.userRepo.create({ ...data, passwordHash });

        const { accessToken, refreshToken } = await this.generateTokens(user);

        return { user: this.sanitizeUser(user), accessToken, refreshToken };
    }

    async login(data: any) {
        const user = await this.userRepo.findByEmail(data.email);
        if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
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
