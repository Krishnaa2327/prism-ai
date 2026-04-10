-- CreateTable: escalation_tickets
CREATE TABLE "escalation_tickets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "end_user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "step_id" TEXT,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "agent_message" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "escalation_tickets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "escalation_tickets_organization_id_status_idx" ON "escalation_tickets"("organization_id", "status");
CREATE INDEX "escalation_tickets_end_user_id_idx" ON "escalation_tickets"("end_user_id");

ALTER TABLE "escalation_tickets" ADD CONSTRAINT "escalation_tickets_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "escalation_tickets" ADD CONSTRAINT "escalation_tickets_end_user_id_fkey"
    FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
