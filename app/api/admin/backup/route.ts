import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function GET() {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const [
      users,
      parametres,
      lots,
      produits,
      ventes,
      reparations,
      mouvements,
      factures,
      factureLignes,
      journal,
      notifications,
      produitImages,
      historiqueStatuts,
      pushSubscriptions,
      fcmTokens
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          langue: true,
          // Sécurité : exclure password_hash, login_attempts, locked_until, tokens push
        }
      }),
      prisma.parametres.findFirst(),
      prisma.lot.findMany(),
      prisma.produit.findMany(),
      prisma.vente.findMany(),
      prisma.reparation.findMany(),
      prisma.mouvementCaisse.findMany(),
      prisma.facture.findMany(),
      prisma.factureLigne.findMany(),
      prisma.journalActivite.findMany(),
      prisma.notification.findMany(),
      prisma.produitImage.findMany(),
      prisma.historiqueStatut.findMany(),
      prisma.pushSubscription.findMany(),
      prisma.fcmToken.findMany()
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: "1.1",
      data: {
        users,
        parametres,
        lots,
        produits,
        ventes,
        reparations,
        mouvements,
        factures,
        factureLignes,
        journal,
        notifications,
        produitImages,
        historiqueStatuts,
        pushSubscriptions,
        fcmTokens
      }
    };

    // Enregistrer l'action
    await enregistrerActivite(prisma, session.id, ACTIONS_JOURNAL.BACKUP_EXPORTER);

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup_maxy_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error("Erreur backup:", error);
    return NextResponse.json({ error: "Erreur lors de la génération de la sauvegarde" }, { status: 500 });
  }
}
