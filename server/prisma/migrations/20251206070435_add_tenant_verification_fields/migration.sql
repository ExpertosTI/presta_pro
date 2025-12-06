/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_verificationToken_key" ON "Tenant"("verificationToken");
