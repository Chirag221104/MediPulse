import { User, IUser } from '../models/user.model';

export class UserRepository {
    async create(data: Partial<IUser>): Promise<IUser> {
        const user = new User(data);
        return await user.save();
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return await User.findOne({ email });
    }

    async findById(id: string): Promise<IUser | null> {
        return await User.findById(id);
    }

    async updateRefreshToken(userId: string, tokenHash: string | null, expiresAt?: Date): Promise<void> {
        if (tokenHash === null) {
            await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
        } else {
            await User.findByIdAndUpdate(userId, {
                refreshToken: {
                    tokenHash,
                    issuedAt: new Date(),
                    expiresAt,
                },
            });
        }
    }

    async update(id: string, data: any): Promise<IUser | null> {
        return await User.findByIdAndUpdate(id, data, { new: true });
    }
}
