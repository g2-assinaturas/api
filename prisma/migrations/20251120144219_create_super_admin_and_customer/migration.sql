/*
  Warnings:

  - The values [HALF_YEARLY] on the enum `PlanInterval` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `role` on the `company_users` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `company_users` table. All the data in the column will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,companyId]` on the table `company_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cpf,companyId]` on the table `company_users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpf` to the `company_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `company_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `company_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `company_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `company_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

-- AlterEnum
BEGIN;
CREATE TYPE "PlanInterval_new" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'YEARLY');
ALTER TABLE "public"."plans" ALTER COLUMN "interval" DROP DEFAULT;
ALTER TABLE "plans" ALTER COLUMN "interval" TYPE "PlanInterval_new" USING ("interval"::text::"PlanInterval_new");
ALTER TYPE "PlanInterval" RENAME TO "PlanInterval_old";
ALTER TYPE "PlanInterval_new" RENAME TO "PlanInterval";
DROP TYPE "public"."PlanInterval_old";
ALTER TABLE "plans" ALTER COLUMN "interval" SET DEFAULT 'MONTHLY';
COMMIT;

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIALING';

-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_companyId_fkey";

-- DropForeignKey
ALTER TABLE "company_users" DROP CONSTRAINT "company_users_companyId_fkey";

-- DropForeignKey
ALTER TABLE "company_users" DROP CONSTRAINT "company_users_userId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_companyId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";

-- DropIndex
DROP INDEX "company_users_userId_companyId_key";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "contractDate" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "themeConfig" JSONB,
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "company_users" DROP COLUMN "role",
DROP COLUMN "userId",
ADD COLUMN     "cpf" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "features" JSONB;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "customerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "webhook_events" ADD COLUMN     "companyId" TEXT;

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "CompanyRole";

-- DropEnum
DROP TYPE "GlobalRole";

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "externalId" TEXT,
    "metadata" JSONB,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_companyId_key" ON "customers"("email", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_email_companyId_key" ON "company_users"("email", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_cpf_companyId_key" ON "company_users"("cpf", "companyId");

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
