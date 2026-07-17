import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE notifications, mouvements_caisse, historique_statuts,
     reparations, ventes, produits, lots, parametres, users
     RESTART IDENTITY CASCADE`
  );

  await prisma.user.createMany({
    data: [
      { username: "imed", password_hash: hashPassword("imed2026"), role: "gerant" },
      { username: "raouf", password_hash: hashPassword("raouf2026"), role: "technicien" },
      { username: "samy", password_hash: hashPassword("samy2026"), role: "dev" },
      { username: "louay", password_hash: hashPassword("louay2026"), role: "dev" },
    ],
  });

  await prisma.parametres.create({
    data: { id: 1, marge_minimum_pct: 20, objectif_reserve: 50000 },
  });

  console.log("Base initialisée : 4 comptes, paramètres par défaut, aucune donnée factice.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
