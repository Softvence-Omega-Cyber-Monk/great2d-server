import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        this.logger.log('Firebase Admin initialized successfully');
      } catch (error) {
        this.logger.error('Error initializing Firebase Admin:', error);
      }
    }
  }

  /**
   * Send push notification when bill status changes
   */
  async sendBillStatusNotification(
    fcmToken: string,
    providerName: string,
    oldStatus: string,
    newStatus: string,
    billId: string,
  ): Promise<void> {
    try {
      const { title, body } = this.getNotificationContent(
        providerName,
        oldStatus,
        newStatus,
      );

      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          type: 'bill_status_change',
          billId,
          oldStatus,
          newStatus,
          providerName,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'bill_notifications',
            priority: 'high',
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
      this.logger.log(`Successfully sent notification: ${response}`);
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      
      // Handle specific FCM errors
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`Invalid or expired FCM token for bill ${billId}`);
        // You might want to mark this token as invalid in the database
      }
      
      throw error;
    }
  }

  /**
   * Send notification to multiple devices using sendEach
   */
  async sendBatchNotification(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number; responses: any[] }> {
    try {
      // Create individual messages for each token
      const messages: admin.messaging.Message[] = fcmTokens.map(token => ({
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
            channelId: 'bill_notifications',
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
      }));

      // Send messages individually
      const responses = await Promise.allSettled(
        messages.map(message => admin.messaging().send(message))
      );

      const successCount = responses.filter(r => r.status === 'fulfilled').length;
      const failureCount = responses.filter(r => r.status === 'rejected').length;

      this.logger.log(`Successfully sent ${successCount} notifications, ${failureCount} failed`);

      return {
        successCount,
        failureCount,
        responses,
      };
    } catch (error) {
      this.logger.error(`Error sending batch notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification to multiple tokens (alternative using sendAll - deprecated but available)
   */
  async sendToMultipleTokens(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      // Send to each token individually
      const promises = fcmTokens.map(async (token) => {
        try {
          await this.sendCustomNotification(token, title, body, data);
          return { success: true, token };
        } catch (error) {
          this.logger.error(`Failed to send to token ${token}: ${error.message}`);
          return { success: false, token, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      this.logger.log(`Batch notification results: ${successCount} success, ${failureCount} failed`);
    } catch (error) {
      this.logger.error(`Error in sendToMultipleTokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notification content based on status change
   */
  private getNotificationContent(
    providerName: string,
    oldStatus: string,
    newStatus: string,
  ): { title: string; body: string } {
    const statusMessages: Record<string, { title: string; body: string }> = {
      draft: {
        title: 'Bill Draft Created',
        body: `Your negotiation draft for ${providerName} has been created.`,
      },
      sent: {
        title: 'Negotiation Email Sent',
        body: `Your negotiation email to ${providerName} has been sent successfully!`,
      },
      negotiating: {
        title: 'Negotiation in Progress',
        body: `${providerName} is reviewing your negotiation request.`,
      },
      successful: {
        title: '🎉 Negotiation Successful!',
        body: `Great news! Your negotiation with ${providerName} was successful!`,
      },
      failed: {
        title: 'Negotiation Update',
        body: `Your negotiation with ${providerName} didn't go through this time.`,
      },
      cancelled: {
        title: 'Negotiation Cancelled',
        body: `Your negotiation with ${providerName} has been cancelled.`,
      },
    };

    return (
      statusMessages[newStatus] || {
        title: 'Bill Status Updated',
        body: `Your bill with ${providerName} has been updated from ${oldStatus} to ${newStatus}.`,
      }
    );
  }

  /**
   * Test if FCM token is valid
   */
  async validateToken(fcmToken: string): Promise<boolean> {
    try {
      // Try to send a dry-run message to validate token
      await admin.messaging().send(
        {
          token: fcmToken,
          data: { test: 'true' },
        },
        true, // dry run
      );
      return true;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'general_notifications',
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

      await admin.messaging().send(message);
      this.logger.log('Custom notification sent successfully');
    } catch (error) {
      this.logger.error(`Error sending custom notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification with topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'general_notifications',
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
      this.logger.log(`Successfully sent topic notification: ${response}`);
    } catch (error) {
      this.logger.error(`Error sending topic notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(fcmTokens: string[], topic: string): Promise<void> {
    try {
      const response = await admin.messaging().subscribeToTopic(fcmTokens, topic);
      this.logger.log(`Successfully subscribed ${response.successCount} tokens to topic: ${topic}`);
      
      if (response.failureCount > 0) {
        this.logger.warn(`Failed to subscribe ${response.failureCount} tokens to topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Error subscribing to topic: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(fcmTokens: string[], topic: string): Promise<void> {
    try {
      const response = await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
      this.logger.log(`Successfully unsubscribed ${response.successCount} tokens from topic: ${topic}`);
      
      if (response.failureCount > 0) {
        this.logger.warn(`Failed to unsubscribe ${response.failureCount} tokens from topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from topic: ${error.message}`);
      throw error;
    }
  }
}