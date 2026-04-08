import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { 
  AppStoreServerAPIClient, 
  Environment, 
  SignedDataVerifier, 
} from '@apple/app-store-server-library';
import { AppleVerifyDto } from './dto/apple-verify.dto';
import * as jose from 'jose';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppleIapService implements OnModuleInit {
  private readonly logger = new Logger(AppleIapService.name);
  private apiClient: AppStoreServerAPIClient;
  private verifier: SignedDataVerifier;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.initializeAppleClient();
  }

  private initializeAppleClient() {
    const issuerId = this.configService.get<string>('APPLE_ISSUER_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const bundleId = this.configService.get<string>('APPLE_BUNDLE_ID');
    const envStr = this.configService.get<string>('APPLE_ENVIRONMENT') || 'SANDBOX';
    const environment = envStr === 'PRODUCTION' ? Environment.PRODUCTION : Environment.SANDBOX;

    // Load Private Key (.p8)
    // Priority: 1. Environment Variable content, 2. Local File
    let privateKey = this.configService.get<string>('APPLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    
    if (!privateKey) {
      const p8Path = path.join(process.cwd(), 'certs', 'apple', `AuthKey_${keyId}.p8`);
      if (fs.existsSync(p8Path)) {
        privateKey = fs.readFileSync(p8Path, 'utf8');
        this.logger.log(`Loaded Apple Private Key from file: ${p8Path}`);
      }
    }

    if (privateKey) {
      const lineCount = privateKey.split('\n').length;
      const hasNewlines = privateKey.includes('\n');
      this.logger.debug(`Private Key Loaded. Lines: ${lineCount}, Format valid: ${hasNewlines}`);
    }

    // Load Root Certificates for local JWS verification
    const rootCerts: Buffer[] = [];
    const certsDir = path.join(process.cwd(), 'certs', 'apple');
    
    if (fs.existsSync(certsDir)) {
      const files = fs.readdirSync(certsDir);
      files.forEach(file => {
        if (file.endsWith('.cer') || file.endsWith('.der') || file.endsWith('.pem')) {
          rootCerts.push(fs.readFileSync(path.join(certsDir, file)));
        }
      });
      if (rootCerts.length > 0) {
        this.logger.log(`Loaded ${rootCerts.length} Apple Root Certificates from ${certsDir}`);
      } else {
        this.logger.warn(`No Apple Root Certificates found in ${certsDir}. Webhook verification will likely fail.`);
      }
    } else {
      this.logger.warn(`Certificates directory not found at ${certsDir}`);
    }

    if (!issuerId || !keyId || !bundleId || !privateKey) {
      this.logger.error('Apple IAP credentials missing! Ensure APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_BUNDLE_ID, and APPLE_PRIVATE_KEY are set.');
      return;
    }

    try {
      this.apiClient = new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, environment);
      
      // Initialize Verifier with the root certificates we loaded
      // If rootCerts is empty, it will use the default system trust (less reliable for IAP)
      this.verifier = new SignedDataVerifier(rootCerts, true, environment, bundleId);
      
      this.logger.log(`Apple IAP Service initialized successfully in ${envStr} mode.`);
    } catch (error) {
      this.logger.error(`Failed to initialize Apple IAP Service: ${error.message}`);
    }
  }

  /**
   * Validates an Apple IAP purchase using ONLY the App Store Server API (Network Call).
   * Local cryptographic verification is skipped as requested.
   */
  async validatePurchase(userId: string, dto: AppleVerifyDto) {
    this.logger.log(`Validating Apple purchase for user: ${userId}, Transaction: ${dto.transactionId}`);

    if (!this.apiClient) {
      throw new BadRequestException('Apple IAP service not properly configured');
    }

    // 1. Manual Decode (No signature verification)
    let decodedTransaction: any = {};
    const isV1Receipt = !dto.jwsRepresentation.includes('.');

    // DEBUG LOGS (Restored)
    this.logger.debug(`Received data length: ${dto.jwsRepresentation?.length}`);
    this.logger.debug(`Data Sample: ${dto.jwsRepresentation?.substring(0, 50)}...`);

    if (isV1Receipt) {
      this.logger.log('Legacy V1 Receipt detected. Skipping local JWS decoding and relying on Server API.');
    } else {
      try {
        decodedTransaction = jose.decodeJwt(dto.jwsRepresentation);
      } catch (error) {
        this.logger.error(`Failed to decode JWS: ${error.message}`);
        throw new BadRequestException(`Invalid purchase data: ${error.message}`);
      }
    }

    const transactionId = decodedTransaction.transactionId || dto.transactionId;
    const productId = decodedTransaction.productId; // May be undefined for V1
    const originalTransactionId = decodedTransaction.originalTransactionId; // May be undefined for V1
    const iapEnv = decodedTransaction.environment || this.configService.get('APPLE_ENVIRONMENT');
    const appAccountToken = decodedTransaction.appAccountToken;

    // 2. Authoritative Call to App Store Server API (Works for both V1 and V2 IDs)
    let apiTransaction: any;
    try {
      // This call confirms the transaction actually exists on Apple's servers.
      const response = await this.apiClient.getTransactionInfo(dto.transactionId);
      
      if (!response || !response.signedTransactionInfo) {
        throw new BadRequestException('Transaction not found on Apple servers');
      }

      // Decode the response from Apple's API
      apiTransaction = jose.decodeJwt(response.signedTransactionInfo);
      
      if (apiTransaction.transactionId !== dto.transactionId) {
        throw new BadRequestException('API Transaction ID mismatch');
      }
    } catch (error) {
      this.logger.error(`App Store Server API validation failed: ${error.message}`);
      throw new BadRequestException(`Apple Server validation failed: ${error.message}`);
    }

    // 3. Extract final data from the authoritative API response
    const finalProductId = apiTransaction.productId;
    const finalOriginalTransactionId = apiTransaction.originalTransactionId;
    const finalPurchaseDate = apiTransaction.purchaseDate;
    const finalExpiresDate = apiTransaction.expiresDate;
    const finalEnvironment = apiTransaction.environment;

    this.logger.debug(`Authoritative Data from Apple:
      - Product: ${finalProductId}
      - Original TX: ${finalOriginalTransactionId}
      - Purchase Date: ${new Date(finalPurchaseDate).toISOString()}
      - Expiry Date: ${finalExpiresDate ? new Date(finalExpiresDate).toISOString() : 'N/A'}
      - Environment: ${finalEnvironment}
    `);

    // 4. Deduplication Check
    const existingTransaction = await this.prisma.subscription.findUnique({
      where: { transactionId: dto.transactionId },
    });

    if (existingTransaction) {
      return existingTransaction;
    }

    // 5. Find the Plan
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { appleProductId: finalProductId },
    });

    if (!plan) {
      throw new NotFoundException(`No subscription plan found for product ${finalProductId}`);
    }

    // 6. Update Database
    const start = new Date(finalPurchaseDate);
    const end = new Date(finalExpiresDate);

    await this.prisma.subscription.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        subscriptionPlanId: plan.subscriptionPlanId,
        transactionId: dto.transactionId,
        originalTransactionId: finalOriginalTransactionId,
        platform: 'apple',
        purchaseToken: dto.jwsRepresentation,
        environment: finalEnvironment,
        appAccountToken: appAccountToken,
        startDate: start,
        expiresAt: end,
        isActive: true,
      },
      include: {
        subscriptionPlan: true,
      },
    });

    return subscription;
  }

  /**
   * Handles Apple Server Notifications V2 (Webhooks)
   * Local cryptographic verification is skipped.
   */
  async handleWebhook(payload: any) {
    if (!payload || !payload.signedPayload) {
      this.logger.error('Received Apple webhook with missing signedPayload');
      return { status: 'ignored' };
    }

    let decodedNotification: any;
    try {
      // Manual Decode (No signature verification)
      decodedNotification = jose.decodeJwt(payload.signedPayload);
    } catch (error) {
      this.logger.error(`Webhook decode failed: ${error.message}`);
      return { status: 'error' };
    }

    const { notificationType, data } = decodedNotification;
    this.logger.log(`Received Apple Notification: ${notificationType}`);

    if (!data || !data.signedTransactionInfo) {
      return { status: 'ok' };
    }

    // Decode transaction info manually
    let transactionInfo: any;
    try {
      transactionInfo = jose.decodeJwt(data.signedTransactionInfo);
    } catch (error) {
      this.logger.error(`Webhook transaction info decode failed: ${error.message}`);
      return { status: 'error' };
    }

    const {
      originalTransactionId,
      transactionId,
      expiresDate,
      purchaseDate,
      revocationDate,
    } = transactionInfo;

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
        await this.updateSubscription(originalTransactionId, {
          transactionId,
          expiresAt: new Date(expiresDate),
          startDate: new Date(purchaseDate),
          isActive: true,
        });
        break;

      case 'EXPIRED':
      case 'DID_FAIL_TO_RENEW':
      case 'REFUND':
      case 'REVOKE':
        await this.updateSubscription(originalTransactionId, {
          isActive: false,
          expiresAt: revocationDate ? new Date(revocationDate) : new Date(),
        });
        break;

      default:
        this.logger.log(`Notification ${notificationType} received - no action taken.`);
    }

    return { status: 'ok' };
  }

  private async updateSubscription(originalTransactionId: string, updateData: any) {
    try {
      const sub = await this.prisma.subscription.findFirst({
        where: { originalTransactionId },
        orderBy: { createdAt: 'desc' }, // Get the most recent one
      });

      if (sub) {
        await this.prisma.subscription.update({
          where: { subscriptionId: sub.subscriptionId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });
        this.logger.log(`Subscription ${sub.subscriptionId} updated successfully.`);
      } else {
        this.logger.warn(`No subscription record found to update for originalTransactionId: ${originalTransactionId}`);
      }
    } catch (error) {
      if (error.code === 'P1017' || error.message.includes('closed the connection')) {
        this.logger.error('Database connection was dropped by the server (Neon cold start?). Please retry the request.');
      } else {
        this.logger.error(`Failed to update subscription via webhook: ${error.message}`);
      }
    }
  }
}
