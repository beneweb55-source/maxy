import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const countAvant = await prisma.mouvementCaisse.count();
  console.log(`Nombre de mouvements avant suppression : ${countAvant}`);

  const resultat = await prisma.mouvementCaisse.deleteMany({});
  console.log(`Mouvements de caisse supprimés avec succès : ${resultat.count}`);

  const countApres = await prisma.mouvementCaisse.count();
  console.log(`Nombre de mouvements après purge : ${countApres}`);
}

main()
  .catch((e) => {
    console.error("Erreur lors de la purge :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
