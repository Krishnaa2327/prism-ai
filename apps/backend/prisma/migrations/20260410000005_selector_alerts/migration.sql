-- AddColumn: selector alert config on organizations
ALTER TABLE "organizations"
  ADD COLUMN "selector_alert_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "selector_alert_webhook" TEXT;
