/*
  Warnings:

  - A unique constraint covering the columns `[stripeAccountId]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeAccountStatus" TEXT DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "companies_stripeAccountId_key" ON "companies"("stripeAccountId");
