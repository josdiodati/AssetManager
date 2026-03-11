ALTER TABLE "Asset" ADD COLUMN "qrToken" TEXT;
UPDATE "Asset" SET "qrToken" = gen_random_uuid()::text WHERE "qrToken" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_qrToken_key" ON "Asset"("qrToken");
