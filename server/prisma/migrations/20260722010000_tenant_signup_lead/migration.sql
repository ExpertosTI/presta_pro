-- CreateTable
CREATE TABLE "TenantSignupLead" (
    "id" TEXT NOT NULL,
    "companyName" TEXT,
    "adminEmail" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'ask_company',
    "draft" JSONB,
    "completionToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSignupLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSignupLead_completionToken_key" ON "TenantSignupLead"("completionToken");

-- CreateIndex
CREATE INDEX "TenantSignupLead_contactPhone_idx" ON "TenantSignupLead"("contactPhone");

-- CreateIndex
CREATE INDEX "TenantSignupLead_completionToken_idx" ON "TenantSignupLead"("completionToken");
