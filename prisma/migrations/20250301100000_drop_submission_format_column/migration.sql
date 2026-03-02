-- Drop old Submission columns that were replaced by "formats" and "outputs".
-- Prisma schema uses "formats" (plural) and "outputs"; the DB had "format" (singular) NOT NULL,
-- causing "Null constraint violation on the fields: (format)" when inserting.

ALTER TABLE "Submission" DROP COLUMN IF EXISTS "format";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "outputUrl";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "outputMimeType";
