import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import * as jose from 'jose';
import * as fs from 'fs';
import * as path from 'path';
import { AppleVerifyDto } from './dto/apple-verify.dto';

interface AppleTransactionPayload {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number | string;
  expiresDate: number | string;
  environment: string;
  appAccountToken?: string;
}

@Injectable()
export class AppleIapService implements OnModuleInit {
  private readonly logger = new Logger(AppleIapService.name);
  private apiClient!: AppStoreServerAPIClient;
  private verifier!: SignedDataVerifier;

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
    const envStr =
      this.configService.get<string>('APPLE_ENVIRONMENT') || 'SANDBOX';
    const environment =
      envStr === 'PRODUCTION' ? Environment.PRODUCTION : Environment.SANDBOX;

    // Load Private Key (.p8)
    // Priority: 1. Environment Variable content, 2. Local File
    let privateKey = this.configService
      .get<string>('APPLE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!privateKey) {
      const p8Path = path.join(
        process.cwd(),
        'certs',
        'apple',
        `AuthKey_${keyId}.p8`,
      );
      if (fs.existsSync(p8Path)) {
        privateKey = fs.readFileSync(p8Path, 'utf8');
        this.logger.log(`Loaded Apple Private Key from file: ${p8Path}`);
      }
    }

    if (privateKey) {
      const lineCount = privateKey.split('\n').length;
      const hasNewlines = privateKey.includes('\n');
      this.logger.debug(
        `Private Key Loaded. Lines: ${lineCount}, Format valid: ${hasNewlines}`,
      );
    }

    // Load Root Certificates for local JWS verification
    const rootCerts: Buffer[] = [];
    const certsDir = path.join(process.cwd(), 'certs', 'apple');

    if (fs.existsSync(certsDir)) {
      const files = fs.readdirSync(certsDir);
      files.forEach((file) => {
        if (
          file.endsWith('.cer') ||
          file.endsWith('.der') ||
          file.endsWith('.pem')
        ) {
          rootCerts.push(fs.readFileSync(path.join(certsDir, file)));
        }
      });
      if (rootCerts.length > 0) {
        this.logger.log(
          `Loaded ${rootCerts.length} Apple Root Certificates from ${certsDir}`,
        );
      } else {
        this.logger.warn(
          `No Apple Root Certificates found in ${certsDir}. Webhook verification will likely fail.`,
        );
      }
    } else {
      this.logger.warn(`Certificates directory not found at ${certsDir}`);
    }

    if (!issuerId || !keyId || !bundleId || !privateKey) {
      this.logger.error(
        'Apple IAP credentials missing! Ensure APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_BUNDLE_ID, and APPLE_PRIVATE_KEY are set.',
      );
      return;
    }

    try {
      this.apiClient = new AppStoreServerAPIClient(
        privateKey,
        keyId,
        issuerId,
        bundleId,
        environment,
      );

      // Initialize Verifier with the root certificates we loaded
      // If rootCerts is empty, it will use the default system trust (less reliable for IAP)
      this.verifier = new SignedDataVerifier(
        rootCerts,
        true,
        environment,
        bundleId,
      );

      this.logger.log(
        `Apple IAP Service initialized successfully in ${envStr} mode.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Apple IAP Service: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Helper to parse Apple's date format (ms or s)
   */
  private parseAppleDate(dateSource: any): Date {
    if (!dateSource) return new Date();

    // If it's already a Date object (not likely from JWS but just in case)
    if (dateSource instanceof Date) return dateSource;

    const numericDate = Number(dateSource);

    if (!Number.isNaN(numericDate)) {
      // Check if it's in seconds (typical Unix timestamp) vs milliseconds
      // Most Apple timestamps in JWS are milliseconds since 1970 (> 10^12)
      // If it's less than 10^12, it's almost certainly seconds
      const MILLISECONDS_THRESHOLD = 1000000000000; // 10^12
      if (numericDate < MILLISECONDS_THRESHOLD) {
        this.logger.debug(
          `Date source ${dateSource} detected as SECONDS (< ${MILLISECONDS_THRESHOLD}). Converting to ms...`,
        );
        return new Date(numericDate * 1000);
      }
      this.logger.debug(
        `Date source ${dateSource} detected as MILLISECONDS (>= ${MILLISECONDS_THRESHOLD}).`,
      );
      return new Date(numericDate);
    }

    const date = new Date(dateSource);
    if (!Number.isNaN(date.getTime())) {
      this.logger.debug(`Date source ${dateSource} parsed as ISO string.`);
      return date;
    }

    this.logger.warn(
      `Unable to parse Apple date source: ${dateSource}. Falling back to current date.`,
    );
    return new Date();
  }

  /**
   * Validates an Apple IAP purchase and syncs the entire subscription lifecycle.
   * Fetches transaction history to ensure the latest renewal is active.
   * Makes the subscription process singleton - only one active subscription per user.
   */
  async validatePurchase(userId: string, dto: AppleVerifyDto) {
    this.logger.log(
      `Validating Apple purchase for user: ${userId}, Transaction: ${dto.transactionId}`,
    );

    if (!this.apiClient) {
      this.logger.error('Apple IAP client is NOT INITIALIZED');
      throw new BadRequestException(
        'Apple IAP service not properly configured',
      );
    }

    // 1. Get authoritative transaction info from Apple
    let apiTransaction: AppleTransactionPayload;
    try {
      this.logger.log(
        `Fetching transaction info from Apple for: ${dto.transactionId}`,
      );
      const response = await this.apiClient.getTransactionInfo(
        dto.transactionId,
      );

      if (!response || !response.signedTransactionInfo) {
        throw new BadRequestException('Transaction not found on Apple servers');
      }

      apiTransaction = jose.decodeJwt(
        response.signedTransactionInfo,
      ) as unknown as AppleTransactionPayload;
      this.logger.debug(
        `Received transaction info for TX: ${apiTransaction.transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Apple API validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Apple Server validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 2. Extract data
    const finalProductId = apiTransaction.productId;
    const finalOriginalTransactionId = apiTransaction.originalTransactionId;
    const finalTransactionId = apiTransaction.transactionId;
    const finalPurchaseDateRaw = apiTransaction.purchaseDate;
    const finalExpiresDateRaw = apiTransaction.expiresDate;
    const finalEnvironment = apiTransaction.environment;
    const finalAppAccountToken = apiTransaction.appAccountToken;

    const start = this.parseAppleDate(finalPurchaseDateRaw);
    const end = this.parseAppleDate(finalExpiresDateRaw);

    const now = new Date();
    const isNowActive = end > now;
 
    this.logger.log(`[VALIDATE] Transaction details:
      - Product ID: ${finalProductId}
      - Original TX ID: ${finalOriginalTransactionId}
      - TX ID: ${finalTransactionId}
      - Purchase Date: ${start.toISOString()}
      - Expires At: ${end.toISOString()}
      - Now: ${now.toISOString()}
      - Is Active: ${isNowActive}
    `);

    // 3. Find subscription plan
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { appleProductId: finalProductId },
    });

    if (!plan) {
      this.logger.error(
        `No SubscriptionPlan found with appleProductId "${finalProductId}"`,
      );
      throw new NotFoundException(
        `No subscription plan found for product ${finalProductId}`,
      );
    }

    // 4. Ensure singleton: Deactivate all other active subscriptions for this user
    await this.prisma.subscription.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // 5. Check if we already have this transaction
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { transactionId: finalTransactionId },
    });

    if (existingSubscription) {
      // Update existing
      const updatedSubscription = await this.prisma.subscription.update({
        where: { subscriptionId: existingSubscription.subscriptionId },
        data: {
          userId,
          isActive: isNowActive,
          expiresAt: end,
          startDate: start,
          purchaseToken: dto.jwsRepresentation,
          appAccountToken: finalAppAccountToken,
          environment: finalEnvironment,
          originalTransactionId: finalOriginalTransactionId,
          platform: 'apple',
          updatedAt: new Date(),
        },
        include: {
          subscriptionPlan: true,
        },
      });
      this.logger.log(
        `Updated existing subscription ${updatedSubscription.subscriptionId} to latest state`,
      );
      return updatedSubscription;
    } else {
      // Create new
      const newSubscription = await this.prisma.subscription.create({
        data: {
          userId,
          subscriptionPlanId: plan.subscriptionPlanId,
          transactionId: finalTransactionId,
          originalTransactionId: finalOriginalTransactionId,
          platform: 'apple',
          purchaseToken: dto.jwsRepresentation,
          environment: finalEnvironment,
          appAccountToken: finalAppAccountToken,
          startDate: start,
          expiresAt: end,
          isActive: isNowActive,
        },
        include: {
          subscriptionPlan: true,
        },
      });
      this.logger.log(
        `Created new subscription ${newSubscription.subscriptionId}`,
      );
      return newSubscription;
    }
  }
}
