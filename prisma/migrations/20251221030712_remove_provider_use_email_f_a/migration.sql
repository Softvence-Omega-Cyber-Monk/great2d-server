/*
  Warnings:

  - You are about to drop the column `providerId` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the `providers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `providerEmail` to the `bills` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_providerId_fkey";

-- DropIndex
DROP INDEX "bills_providerId_idx";

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "providerId",
ADD COLUMN     "providerEmail" TEXT NOT NULL,
ADD COLUMN     "providerName" TEXT,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- DropTable
DROP TABLE "providers";

-- CreateIndex
CREATE INDEX "bills_providerEmail_idx" ON "bills"("providerEmail");
