-- CreateEnum
CREATE TYPE "PayPalPaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

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
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_billTrackingId_fkey" FOREIGN KEY ("billTrackingId") REFERENCES "bill_tracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("subscriptionId") ON DELETE SET NULL ON UPDATE CASCADE;
