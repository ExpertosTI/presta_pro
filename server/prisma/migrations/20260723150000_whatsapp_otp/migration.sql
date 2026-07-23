-- CreateTable
CREATE TABLE "WhatsAppOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'tenant_signup',
    "codeHash" TEXT NOT NULL,
    "verifyToken" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppOtp_verifyToken_key" ON "WhatsAppOtp"("verifyToken");

-- CreateIndex
CREATE INDEX "WhatsAppOtp_phone_purpose_idx" ON "WhatsAppOtp"("phone", "purpose");
