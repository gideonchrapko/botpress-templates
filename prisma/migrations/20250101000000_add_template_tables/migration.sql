-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'html',
    "version" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schema" TEXT,
    "configJson" TEXT,
    "htmlContent" TEXT,
    "htmlVariant2" TEXT,
    "htmlVariant3" TEXT,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateNode" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TemplateNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_family_key" ON "Template"("family");
CREATE INDEX "Template_family_idx" ON "Template"("family");
CREATE INDEX "Template_format_idx" ON "Template"("format");
CREATE INDEX "TemplateNode_templateId_idx" ON "TemplateNode"("templateId");
CREATE INDEX "TemplateNode_parentId_idx" ON "TemplateNode"("parentId");
CREATE INDEX "TemplateNode_nodeId_idx" ON "TemplateNode"("nodeId");

-- AddForeignKey
ALTER TABLE "TemplateNode" ADD CONSTRAINT "TemplateNode_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateNode" ADD CONSTRAINT "TemplateNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TemplateNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
