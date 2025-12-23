/*
  Warnings:

  - The `status` column on the `bills` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `category` column on the `bills` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `category` on the `bill_tracking` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "bill_tracking" DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other';

-- DropEnum
DROP TYPE "BillCategory";

-- DropEnum
DROP TYPE "BillStatus";

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_category_idx" ON "bills"("category");
