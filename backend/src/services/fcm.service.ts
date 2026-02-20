import * as admin from 'firebase-admin';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';

export class FcmService {
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            const serviceAccount = process.env.FCM_SERVICE_ACCOUNT_KEY;

            if (!serviceAccount) {
                logger.warn('FCM_SERVICE_ACCOUNT_KEY not found in environment. Push notifications will be disabled.');
                return;
            }

            // The key can be a path or a base64 encoded JSON string
            let config;
            try {
                config = JSON.parse(
                    serviceAccount.startsWith('{')
                        ? serviceAccount
                        : Buffer.from(serviceAccount, 'base64').toString()
                );
            } catch (e) {
                // Fallback to path if not JSON/Base64
                config = serviceAccount;
            }

            admin.initializeApp({
                credential: admin.credential.cert(config),
            });

            this.initialized = true;
            logger.info('Firebase Admin initialized successfully.');
        } catch (error: any) {
            logger.error('Failed to initialize Firebase Admin:', error);
        }
    }

    /**
     * Sends a push notification to all devices registered to a user.
     */
    async sendToUser(userId: string, title: string, body: string, data?: any) {
        if (!this.initialized) return;

        try {
            const user = await User.findById(userId).select('fcmTokens');
            if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

            const message: admin.messaging.MulticastMessage = {
                notification: { title, body },
                data: data || {},
                tokens: user.fcmTokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            // Cleanup invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            invalidTokens.push(user.fcmTokens[idx]);
                        }
                    }
                });

                if (invalidTokens.length > 0) {
                    await User.findByIdAndUpdate(userId, {
                        $pull: { fcmTokens: { $in: invalidTokens } }
                    });
                }
            }

            logger.info(`FCM: Sent notification to user ${userId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        } catch (error) {
            logger.error('FCM: Error sending notification:', error);
        }
    }
}

export const fcmService = new FcmService();
