-- Add missing columns to Submission (formats, doorTime, outputs)
-- If your DB was created from an older migration that had "format", "outputUrl", "outputMimeType",
-- we add the new columns and leave old ones for now so existing data is not lost.

-- Add "formats" if it doesn't exist (default JSON array of formats)
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "formats" TEXT NOT NULL DEFAULT '["png"]';

-- Add "doorTime" if it doesn't exist
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "doorTime" TEXT NOT NULL DEFAULT '18:00';

-- Add "outputs" if it doesn't exist (replaces outputUrl/outputMimeType)
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "outputs" TEXT;

-- If your table still has "format" (singular) and no "formats", and Prisma expects "formats", the above ADD COLUMN will work.
-- If the column already exists (e.g. from a previous push), ADD COLUMN IF NOT EXISTS will skip without error.
