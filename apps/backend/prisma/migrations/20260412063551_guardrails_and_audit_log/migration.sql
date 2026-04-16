-- AlterTable
ALTER TABLE "onboarding_steps" ADD COLUMN     "allowed_actions" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_id" TEXT,
    "end_user_id" TEXT,
    "step_id" TEXT,
    "action_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_session_id_idx" ON "audit_logs"("session_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
