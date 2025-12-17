-- CreateEnum
CREATE TYPE "BillPaymentStatus" AS ENUM ('due', 'paid', 'overdue');

-- AlterTable
ALTER TABLE "Bill" ALTER COLUMN "newRate" DROP NOT NULL;

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

-- CreateIndex
CREATE INDEX "bill_tracking_userId_idx" ON "bill_tracking"("userId");

-- CreateIndex
CREATE INDEX "bill_tracking_month_idx" ON "bill_tracking"("month");

-- CreateIndex
CREATE INDEX "bill_tracking_paymentStatus_idx" ON "bill_tracking"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "bill_tracking_billId_month_key" ON "bill_tracking"("billId", "month");

-- AddForeignKey
ALTER TABLE "bill_tracking" ADD CONSTRAINT "bill_tracking_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_tracking" ADD CONSTRAINT "bill_tracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
