/*
  Warnings:

  - You are about to drop the column `subscriptionPlanId` on the `User` table. All the data in the column will be lost.
  - Changed the type of `duration` on the `SubscriptionPlan` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_subscriptionPlanId_fkey";

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "duration",
ADD COLUMN     "duration" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "subscriptionPlanId",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

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

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_transactionId_key" ON "Subscription"("transactionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_subscriptionPlanId_idx" ON "Subscription"("subscriptionPlanId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("subscriptionPlanId") ON DELETE RESTRICT ON UPDATE CASCADE;
