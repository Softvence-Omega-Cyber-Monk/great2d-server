-- CreateEnum
CREATE TYPE "BillPaymentStatus" AS ENUM ('due', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "PayPalPaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('internet', 'electricity', 'water', 'mobile', 'gas', 'other');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('draft', 'sent', 'negotiating', 'successful', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "profilePictureUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "isDarkMode" BOOLEAN NOT NULL DEFAULT false,
    "isNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isUsingBiometrics" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monthlySavingsGoal" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "providers" (
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("providerId")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accountDetails" TEXT,
    "negotiationRecommendation" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "emailThreadId" TEXT,
    "emailMessageId" TEXT,
    "status" "BillStatus" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardHolderName" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "cvv" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "subscriptionPlanId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("subscriptionPlanId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("subscriptionId")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "resetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("resetId")
);

-- CreateTable
CREATE TABLE "bill_tracking" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "billName" TEXT NOT NULL,
    "category" "BillCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "BillPaymentStatus" NOT NULL DEFAULT 'due',
    "paidAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paypal_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paypalOrderId" TEXT NOT NULL,
    "paypalPaymentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayPalPaymentStatus" NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "payerEmail" TEXT,
    "payerName" TEXT,
    "payerId" TEXT,
    "billTrackingId" TEXT,
    "subscriptionId" TEXT,
    "paypalResponse" JSONB,
    "errorMessage" TEXT,
    "refundId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paypal_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "bills_userId_idx" ON "bills"("userId");

-- CreateIndex
CREATE INDEX "bills_providerId_idx" ON "bills"("providerId");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_transactionId_key" ON "Subscription"("transactionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_subscriptionPlanId_idx" ON "Subscription"("subscriptionPlanId");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- CreateIndex
CREATE INDEX "password_resets_code_idx" ON "password_resets"("code");

-- CreateIndex
CREATE INDEX "bill_tracking_userId_idx" ON "bill_tracking"("userId");

-- CreateIndex
CREATE INDEX "bill_tracking_month_idx" ON "bill_tracking"("month");

-- CreateIndex
CREATE INDEX "bill_tracking_paymentStatus_idx" ON "bill_tracking"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "bill_tracking_billId_month_key" ON "bill_tracking"("billId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "paypal_payments_paypalOrderId_key" ON "paypal_payments"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "paypal_payments_paypalPaymentId_key" ON "paypal_payments"("paypalPaymentId");

-- CreateIndex
CREATE INDEX "paypal_payments_userId_idx" ON "paypal_payments"("userId");

-- CreateIndex
CREATE INDEX "paypal_payments_status_idx" ON "paypal_payments"("status");

-- CreateIndex
CREATE INDEX "paypal_payments_paypalOrderId_idx" ON "paypal_payments"("paypalOrderId");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("providerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("subscriptionPlanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_tracking" ADD CONSTRAINT "bill_tracking_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_tracking" ADD CONSTRAINT "bill_tracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_billTrackingId_fkey" FOREIGN KEY ("billTrackingId") REFERENCES "bill_tracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("subscriptionId") ON DELETE SET NULL ON UPDATE CASCADE;
