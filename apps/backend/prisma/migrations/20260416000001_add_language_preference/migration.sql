ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "language_preference" TEXT NOT NULL DEFAULT 'en';
