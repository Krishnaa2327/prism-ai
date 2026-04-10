-- Add trigger configuration fields to onboarding_flows
-- triggerDelay: ms after page load before widget appears (default 30s)
-- urlPattern: comma-separated URL patterns where flow should trigger (empty = all pages)
-- maxTriggersPerUser: max times to show to same user, 0 = unlimited

ALTER TABLE "onboarding_flows"
  ADD COLUMN "trigger_delay_ms"       INTEGER NOT NULL DEFAULT 30000,
  ADD COLUMN "url_pattern"            TEXT    NOT NULL DEFAULT '',
  ADD COLUMN "max_triggers_per_user"  INTEGER NOT NULL DEFAULT 0;
