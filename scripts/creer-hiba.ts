// Crée (ou met à jour) le compte Hiba — Social Media Manager — sans toucher
// au reste de la base. À lancer avec : npx tsx scripts/creer-hiba.ts
// Prérequis : le schéma doit être à jour (npx prisma db push) pour que
// l'enum Role contienne social_media.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  const hiba = await prisma.user.upsert({
    where: { username: "hiba" },
    create: {
      username: "hiba",
      password_hash: hashPassword("hiba2026"),
      role: "social_media",
    },
    update: { role: "social_media" },
  });
  console.log(`Compte prêt : ${hiba.username} (id ${hiba.id}, rôle ${hiba.role}).`);
  console.log("Mot de passe initial : hiba2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
