-- CreateEnum
CREATE TYPE "ModeCout" AS ENUM ('manuel', 'auto');

-- AlterTable
ALTER TABLE "lots" ADD COLUMN     "cout_valide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mode_cout" "ModeCout" NOT NULL DEFAULT 'manuel',
ADD COLUMN     "quantite_attendue" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "parametres" ADD COLUMN     "pct_frais" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pct_parts" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "pct_reinvest" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "pct_reserve" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "produits" ADD COLUMN     "a_jeter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "ventes" ADD COLUMN     "groupe_vente" TEXT;
