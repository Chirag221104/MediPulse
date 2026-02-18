import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const signAccessToken = (payload: object) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (payload: object) => {
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
};
