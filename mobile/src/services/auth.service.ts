import api from './api';

export interface AuthResponse {
    user: { _id: string; name: string; email: string };
    accessToken: string;
    refreshToken: string;
}

export const authService = {
    register: async (name: string, email: string, password: string) => {
        const { data } = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', {
            name,
            email,
            password,
        });
        return data.data;
    },

    login: async (email: string, password: string) => {
        const { data } = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', {
            email,
            password,
        });
        return data.data;
    },

    refreshToken: async (refreshToken: string) => {
        const { data } = await api.post<{ success: boolean; data: { accessToken: string; refreshToken?: string } }>(
            '/auth/refresh',
            { refreshToken }
        );
        return data.data;
    },

    logout: async (refreshToken: string) => {
        await api.post('/auth/logout', { refreshToken });
    },
};
