ALTER TABLE "onboarding_flows" ADD COLUMN IF NOT EXISTS "execution_mode" TEXT NOT NULL DEFAULT 'execute';
