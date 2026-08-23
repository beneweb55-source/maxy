import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";

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
      journal,
      notifications
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.parametres.findFirst(),
      prisma.lot.findMany(),
      prisma.produit.findMany(),
      prisma.vente.findMany(),
      prisma.reparation.findMany(),
      prisma.mouvementCaisse.findMany(),
      prisma.facture.findMany({ include: { lignes: true } }),
      prisma.journalActivite.findMany(),
      prisma.notification.findMany()
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        users,
        parametres,
        lots,
        produits,
        ventes,
        reparations,
        mouvements,
        factures,
        journal,
        notifications
      }
    };

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
