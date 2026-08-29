import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.categorie.count();
  console.log(`Nombre de catégories dans la table Categorie : ${count}`);
  
  if (count > 0) {
    const cats = await prisma.categorie.findMany({ take: 10 });
    console.log("Exemples de catégories :");
    console.log(cats);
  } else {
    console.log("La table Categorie est complètement vide.");
  }

  const produitsSansCat = await prisma.produit.count({ where: { categorie_id: null } });
  console.log(`Nombre de produits avec categorie_id = null : ${produitsSansCat}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
