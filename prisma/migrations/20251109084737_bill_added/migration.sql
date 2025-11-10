-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('internet', 'electricity', 'water', 'mobile', 'gas', 'other');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('successfull', 'negotiating', 'failed');

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "billName" TEXT NOT NULL,
    "category" "BillCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "BillStatus" NOT NULL,
    "previousRate" DOUBLE PRECISION NOT NULL,
    "newRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);
