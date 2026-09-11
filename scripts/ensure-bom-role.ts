/**
 * Script pour s'assurer que la colonne bom_role existe dans la base de données.
 * Usage : npx tsx scripts/ensure-bom-role.ts
 *
 * Utilise DATABASE_URL de l'environnement ou du fichier .env.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    // Vérifier si la colonne bom_role existe
    const result = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Produit' AND column_name = 'bom_role'
      ) as exists`
    );

    const columnExists = result[0]?.exists;

    if (columnExists) {
      console.log("✅ La colonne 'bom_role' existe déjà dans la table Produit.");
    } else {
      console.log("⚠️  La colonne 'bom_role' est absente. Ajout en cours...");
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Produit" ADD COLUMN "bom_role" TEXT NOT NULL DEFAULT 'finished'`
      );
      console.log("✅ Colonne 'bom_role' ajoutée avec succès (défaut: 'finished').");
    }
  } catch (err: any) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
