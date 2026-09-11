-- ============================================================
-- BACKUP SYSTEM — Migration idempotente
-- Sûre à exécuter sur toute DB (Vercel production ou fresh)
-- ============================================================

DO $$
BEGIN
  -- Enums (ignore if exists)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BackupStatus') THEN
    CREATE TYPE "BackupStatus" AS ENUM ('creating', 'ready', 'failed', 'validating', 'corrupted', 'restoring', 'restored');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BackupType') THEN
    CREATE TYPE "BackupType" AS ENUM ('manual', 'automatic', 'pre_restore', 'import');
  END IF;

  -- Table backups
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backups') THEN
    CREATE TABLE "backups" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "description" TEXT,
      "status" "BackupStatus" NOT NULL DEFAULT 'creating',
      "type" "BackupType" NOT NULL DEFAULT 'manual',
      "size" INTEGER NOT NULL DEFAULT 0,
      "checksum" TEXT NOT NULL DEFAULT '',
      "storageKey" TEXT NOT NULL,
      "version" INTEGER NOT NULL DEFAULT 1,
      "databaseVersion" TEXT NOT NULL DEFAULT '',
      "applicationVersion" TEXT NOT NULL DEFAULT '',
      "metadata" JSONB,
      "error" TEXT,
      "cree_par" INTEGER,
      "cree_par_nom" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "backups_storageKey_key" ON "backups"("storageKey");
    CREATE INDEX "backups_status_idx" ON "backups"("status");
    CREATE INDEX "backups_type_idx" ON "backups"("type");
    CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");
  END IF;

  -- Table backup_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_logs') THEN
    CREATE TABLE "backup_logs" (
      "id" SERIAL NOT NULL,
      "backup_id" INTEGER,
      "action" TEXT NOT NULL,
      "user_id" INTEGER,
      "user_nom" TEXT,
      "details" TEXT,
      "success" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "backup_logs_backup_id_idx" ON "backup_logs"("backup_id");
    CREATE INDEX "backup_logs_action_idx" ON "backup_logs"("action");
    CREATE INDEX "backup_logs_created_at_idx" ON "backup_logs"("created_at");
  END IF;

  -- Foreign key (only if not already present)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'backup_logs_backup_id_fkey'
  ) THEN
    ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_backup_id_fkey"
      FOREIGN KEY ("backup_id") REFERENCES "backups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

END $$;
