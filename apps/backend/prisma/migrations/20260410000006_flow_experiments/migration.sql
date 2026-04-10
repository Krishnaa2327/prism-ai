-- CreateTable: flow_experiments
CREATE TABLE "flow_experiments" (
  "id"               TEXT          NOT NULL,
  "organization_id"  TEXT          NOT NULL,
  "name"             TEXT          NOT NULL,
  "status"           TEXT          NOT NULL DEFAULT 'running',
  "control_flow_id"  TEXT          NOT NULL,
  "variant_flow_id"  TEXT          NOT NULL,
  "traffic_split"    INTEGER       NOT NULL DEFAULT 50,
  "winner_id"        TEXT,
  "started_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "concluded_at"     TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "flow_experiments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "flow_experiments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  CONSTRAINT "flow_experiments_control_flow_id_fkey"
    FOREIGN KEY ("control_flow_id") REFERENCES "onboarding_flows"("id") ON DELETE CASCADE,
  CONSTRAINT "flow_experiments_variant_flow_id_fkey"
    FOREIGN KEY ("variant_flow_id") REFERENCES "onboarding_flows"("id") ON DELETE CASCADE
);

CREATE INDEX "flow_experiments_organization_id_idx" ON "flow_experiments"("organization_id");

-- AlterTable: add experiment tracking to sessions
ALTER TABLE "user_onboarding_sessions"
  ADD COLUMN "experiment_id"      TEXT,
  ADD COLUMN "experiment_variant" TEXT;

CREATE INDEX "user_onboarding_sessions_experiment_id_idx"
  ON "user_onboarding_sessions"("experiment_id");
