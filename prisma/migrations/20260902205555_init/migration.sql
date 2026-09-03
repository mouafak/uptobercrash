-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "lamports" BIGINT NOT NULL,
    "tokenBaseUnits" BIGINT NOT NULL,
    "tokensPerSol" BIGINT NOT NULL,
    "txHash" TEXT NOT NULL,
    "slot" BIGINT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "affiliateCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "code" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_txHash_key" ON "Purchase"("txHash");

-- CreateIndex
CREATE INDEX "Purchase_walletAddress_idx" ON "Purchase"("walletAddress");

-- CreateIndex
CREATE INDEX "Purchase_affiliateCode_idx" ON "Purchase"("affiliateCode");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_walletAddress_key" ON "Affiliate"("walletAddress");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_affiliateCode_fkey" FOREIGN KEY ("affiliateCode") REFERENCES "Affiliate"("code") ON DELETE RESTRICT ON UPDATE RESTRICT;
