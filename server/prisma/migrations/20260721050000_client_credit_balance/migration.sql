-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientCreditLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "loanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientCreditLedger_clientId_idx" ON "ClientCreditLedger"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientCreditLedger_tenantId_idx" ON "ClientCreditLedger"("tenantId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClientCreditLedger" ADD CONSTRAINT "ClientCreditLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClientCreditLedger" ADD CONSTRAINT "ClientCreditLedger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
