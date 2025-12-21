import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'great2d',
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@great2d.iam.gserviceaccount.com',
        }),
      });
      this.logger.log('Firebase Admin SDK initialized');
    }
  }

  /**
   * Send push notification to a specific device token
   */
  async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send notification to multiple device tokens
   */
  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`
      );
      return response;
    } catch (error) {
      this.logger.error(`Error sending multicast notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send bill status change notification
   */
  async sendBillStatusNotification(
    token: string,
    providerName: string,
    oldStatus: string,
    newStatus: string,
    billId: string
  ): Promise<string> {
    const statusMessages = {
      draft: 'Your bill is in draft',
      sent: 'Your negotiation email has been sent',
      negotiating: 'Negotiation is in progress',
      successful: 'Negotiation successful! 🎉',
      failed: 'Negotiation was unsuccessful',
      cancelled: 'Negotiation has been cancelled',
    };

    const title = `Bill Status Update - ${providerName}`;
    const body = statusMessages[newStatus] || `Status changed to ${newStatus}`;

    return this.sendNotification(token, title, body, {
      type: 'bill_status_change',
      billId,
      providerName,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Verify if a token is valid
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      // Try to send a dry-run message
      await admin.messaging().send(
        {
          token,
          notification: { title: 'Test', body: 'Test' },
        },
        true // dry run
      );
      return true;
    } catch (error) {
      this.logger.warn(`Invalid FCM token: ${error.message}`);
      return false;
    }
  }
}