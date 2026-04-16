-- CreateTable
CREATE TABLE "session_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "action_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_messages_session_id_created_at_idx" ON "session_messages"("session_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_onboarding_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
