-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "isPartialPayment" BOOLEAN NOT NULL DEFAULT false;
