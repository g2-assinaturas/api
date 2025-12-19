/*
  Warnings:

  - A unique constraint covering the columns `[checkoutSessionId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "checkoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_checkoutSessionId_key" ON "subscriptions"("checkoutSessionId");
