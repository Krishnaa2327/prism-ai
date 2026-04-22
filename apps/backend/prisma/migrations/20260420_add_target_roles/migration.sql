-- AddColumn
ALTER TABLE "onboarding_flows" ADD COLUMN "target_roles" TEXT[] NOT NULL DEFAULT '{}';
