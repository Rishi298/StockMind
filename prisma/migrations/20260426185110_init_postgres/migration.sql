-- CreateTable
CREATE TABLE "StockHolding" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT '',
    "qty" DOUBLE PRECISION NOT NULL,
    "avgBuyPrice" DOUBLE PRECISION NOT NULL,
    "buyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brokerName" TEXT NOT NULL DEFAULT 'Manual',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MFHolding" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "schemeCode" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "amcName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Equity',
    "units" DOUBLE PRECISION NOT NULL,
    "avgNav" DOUBLE PRECISION NOT NULL,
    "investedAmount" DOUBLE PRECISION NOT NULL,
    "buyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MFHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MFNavCache" (
    "id" SERIAL NOT NULL,
    "schemeCode" TEXT NOT NULL,
    "navDate" TEXT NOT NULL,
    "nav" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MFNavCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedSymbol" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebalanceHistory" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RebalanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT '',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundamentalsCache" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "pe" DOUBLE PRECISION,
    "pb" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "roe" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "revenueGrowth" DOUBLE PRECISION,
    "eps" DOUBLE PRECISION,
    "dividendYield" DOUBLE PRECISION,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundamentalsCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockHolding_userId_idx" ON "StockHolding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StockHolding_userId_symbol_accountId_key" ON "StockHolding"("userId", "symbol", "accountId");

-- CreateIndex
CREATE INDEX "MFHolding_userId_idx" ON "MFHolding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MFHolding_userId_schemeCode_key" ON "MFHolding"("userId", "schemeCode");

-- CreateIndex
CREATE INDEX "MFNavCache_schemeCode_idx" ON "MFNavCache"("schemeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MFNavCache_schemeCode_navDate_key" ON "MFNavCache"("schemeCode", "navDate");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "RebalanceHistory_userId_idx" ON "RebalanceHistory"("userId");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_symbol_key" ON "Watchlist"("userId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "FundamentalsCache_symbol_key" ON "FundamentalsCache"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
