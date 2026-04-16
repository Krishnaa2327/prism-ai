-- DropForeignKey
ALTER TABLE "flow_experiments" DROP CONSTRAINT "flow_experiments_control_flow_id_fkey";

-- DropForeignKey
ALTER TABLE "flow_experiments" DROP CONSTRAINT "flow_experiments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "flow_experiments" DROP CONSTRAINT "flow_experiments_variant_flow_id_fkey";

-- DropForeignKey
ALTER TABLE "selector_heal_logs" DROP CONSTRAINT "selector_heal_logs_org_fk";

-- AlterTable
ALTER TABLE "flow_experiments" ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "concluded_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "selector_heal_logs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mcp_connectors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "server_url" TEXT NOT NULL,
    "auth_type" TEXT NOT NULL DEFAULT 'none',
    "auth_value" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcp_connectors_organization_id_idx" ON "mcp_connectors"("organization_id");

-- AddForeignKey
ALTER TABLE "flow_experiments" ADD CONSTRAINT "flow_experiments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_experiments" ADD CONSTRAINT "flow_experiments_control_flow_id_fkey" FOREIGN KEY ("control_flow_id") REFERENCES "onboarding_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_experiments" ADD CONSTRAINT "flow_experiments_variant_flow_id_fkey" FOREIGN KEY ("variant_flow_id") REFERENCES "onboarding_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selector_heal_logs" ADD CONSTRAINT "selector_heal_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_connectors" ADD CONSTRAINT "mcp_connectors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_heal_logs_org_created" RENAME TO "selector_heal_logs_organization_id_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_heal_logs_org_selector" RENAME TO "selector_heal_logs_organization_id_original_selector_idx";

-- RenameIndex
ALTER INDEX "idx_heal_logs_step" RENAME TO "selector_heal_logs_step_id_idx";
