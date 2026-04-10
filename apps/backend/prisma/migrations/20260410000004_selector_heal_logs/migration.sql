-- Selector heal logs
-- Records every time the self-healing resolver had to fall back to a non-primary
-- strategy (or failed entirely). Powers the Flow Health dashboard.

CREATE TABLE "selector_heal_logs" (
  "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"    TEXT NOT NULL,
  "session_id"         TEXT,
  "step_id"            TEXT,
  "original_selector"  TEXT NOT NULL,
  "used_selector"      TEXT,
  "strategy"           TEXT NOT NULL,   -- primary|data-testid|name|aria-label|placeholder|exact-text|fuzzy-class|fuzzy-text|failed
  "action_type"        TEXT,            -- click|fill_form|highlight
  "page"               TEXT NOT NULL,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "selector_heal_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "selector_heal_logs_org_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_heal_logs_org_selector"
  ON "selector_heal_logs"("organization_id", "original_selector");

CREATE INDEX "idx_heal_logs_org_created"
  ON "selector_heal_logs"("organization_id", "created_at" DESC);

CREATE INDEX "idx_heal_logs_step"
  ON "selector_heal_logs"("step_id");
