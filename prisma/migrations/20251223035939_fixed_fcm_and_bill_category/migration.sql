-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "category" "BillCategory" NOT NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX "bills_category_idx" ON "bills"("category");
