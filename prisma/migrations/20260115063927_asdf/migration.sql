-- AlterTable
ALTER TABLE "bill_tracking" ALTER COLUMN "category" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "dueDate" TIMESTAMP(3),
ALTER COLUMN "category" DROP NOT NULL;

-- CreateTable
CREATE TABLE "email_replies" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "snippet" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_replies_messageId_key" ON "email_replies"("messageId");

-- CreateIndex
CREATE INDEX "email_replies_billId_idx" ON "email_replies"("billId");

-- CreateIndex
CREATE INDEX "email_replies_threadId_idx" ON "email_replies"("threadId");

-- CreateIndex
CREATE INDEX "email_replies_messageId_idx" ON "email_replies"("messageId");

-- AddForeignKey
ALTER TABLE "email_replies" ADD CONSTRAINT "email_replies_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
