-- CreateTable
CREATE TABLE "MarketingTool" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iframeUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "MarketingTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingTool_slug_key" ON "MarketingTool"("slug");
CREATE INDEX "MarketingTool_slug_idx" ON "MarketingTool"("slug");
