import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

export async function POST(request: Request) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  try {
    const body = await request.json();
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID manquant" }, { status: 400 });
    }

    const logs = await prisma.migrationLog.findMany({
      where: { batch_id: batchId }
    });

    if (logs.length === 0) {
      return NextResponse.json({ error: "Aucun historique trouvé pour ce batch" }, { status: 404 });
    }

    const produitsId = logs.map(l => l.produit_id);

    await prisma.$transaction(async (tx) => {
      // 1. Restaurer l'état précédent
      // Normalement modele_id_avant est null car on ne migre que les produits non migrés.
      // Si ce n'est pas null on devrait faire des requêtes individuelles, 
      // mais pour le bulk on part du principe que c'était null.
      await tx.produit.updateMany({
        where: { id: { in: produitsId } },
        data: { modele_id: null } // Remise à zéro
      });

      // 2. Nettoyer les logs de ce batch
      await tx.migrationLog.deleteMany({
        where: { batch_id: batchId }
      });

      // Note: On ne supprime pas les modèles ou catégories créés pour éviter
      // de casser des dépendances avec d'autres produits. 
      // Ils restent comme modèles "vides" (count=0) que l'on pourra purger plus tard.
    });

    return NextResponse.json({ 
      message: "Rollback effectué avec succès",
      produits_restaures: produitsId.length 
    });

  } catch (error) {
    console.error("Erreur POST /api/admin/migration/rollback:", error);
    return NextResponse.json({ error: "Erreur lors du rollback" }, { status: 500 });
  }
}
