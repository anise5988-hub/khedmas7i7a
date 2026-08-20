-- CreateEnum
CREATE TYPE "public"."DepositMethod" AS ENUM ('D17', 'BANK_TRANSFER', 'FLOUCI', 'ZITOUNA');

-- CreateTable
CREATE TABLE "public"."WalletDeposit" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "method" "public"."DepositMethod" NOT NULL,
    "amountMillimes" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "proofUrl" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletDeposit_walletId_status_createdAt_idx" ON "public"."WalletDeposit"("walletId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletDeposit_method_reference_key" ON "public"."WalletDeposit"("method", "reference");

-- AddForeignKey
ALTER TABLE "public"."WalletDeposit" ADD CONSTRAINT "WalletDeposit_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
