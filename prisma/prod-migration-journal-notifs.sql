-- Migration : Journal d'activité + Notifications intelligentes
-- Exécuter sur la base de production avant le déploiement.

-- 1. Table journal d'activité (audit log)
CREATE TABLE IF NOT EXISTS "journal_activite" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "entite_type" TEXT,
  "entite_id" INTEGER,
  "details" TEXT,
  "ip" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "journal_activite_user_id_idx" ON "journal_activite"("user_id");
CREATE INDEX IF NOT EXISTS "journal_activite_action_idx" ON "journal_activite"("action");
CREATE INDEX IF NOT EXISTS "journal_activite_created_at_idx" ON "journal_activite"("created_at");
CREATE INDEX IF NOT EXISTS "journal_activite_entite_idx" ON "journal_activite"("entite_type", "entite_id");

-- 2. Nouvelles colonnes sur notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "groupe" TEXT;

CREATE INDEX IF NOT EXISTS "notifications_user_groupe_lu_idx" ON "notifications"("user_id", "groupe", "lu");
