-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('creating', 'ready', 'failed', 'validating', 'corrupted', 'restoring', 'restored');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('manual', 'automatic', 'pre_restore', 'import');

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "backups_storageKey_key" ON "backups"("storageKey");

-- CreateIndex
CREATE INDEX "backups_status_idx" ON "backups"("status");

-- CreateIndex
CREATE INDEX "backups_type_idx" ON "backups"("type");

-- CreateIndex
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");

-- CreateIndex
CREATE INDEX "backup_logs_backup_id_idx" ON "backup_logs"("backup_id");

-- CreateIndex
CREATE INDEX "backup_logs_action_idx" ON "backup_logs"("action");

-- CreateIndex
CREATE INDEX "backup_logs_created_at_idx" ON "backup_logs"("created_at");

-- AddForeignKey
ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "backups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
