-- Ajout colonne raw_data pour persistence des backups sur Vercel (filesystem éphémère)
DO $$ BEGIN
  ALTER TABLE "backups" ADD COLUMN "raw_data" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
