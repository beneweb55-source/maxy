import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("🛠️  CORRECTION RAPIDE DE L'AFFICHAGE");
  console.log("=========================================\n");

  const produits = await prisma.produit.findMany({
    where: { modele_id: { not: null } },
    include: { modele: { include: { categorie: true } } }
  });

  console.log(`${produits.length} produits trouvés ayant un modèle lié.`);

  let up = 0;
  for (const p of produits) {
    if (p.modele && p.modele.categorie) {
      const nouveauCat = p.modele.categorie.nom;
      const nouvelleRef = p.modele.nom;

      if (p.categorie !== nouveauCat || p.reference !== nouvelleRef) {
        await prisma.produit.update({
          where: { id: p.id },
          data: {
            categorie: nouveauCat,
            reference: nouvelleRef
          }
        });
        up++;
      }
    }
  }

  console.log(`✅ Terminés ! ${up} textes mis à jour pour l'affichage de l'inventaire.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
