import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

/**
 * Réinitialisation des données (gérant uniquement).
 *
 * SÉCURITÉ : crée automatiquement une sauvegarde JSON complète avant le TRUNCATE.
 * La sauvegarde est renvoyée dans la réponse pour que le gérant puisse la télécharger.
 */
export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { confirmation } = (corps ?? {}) as { confirmation?: unknown };
  if (confirmation !== "REINITIALISER") {
    return erreur(400, "Confirmation invalide : saisissez exactement REINITIALISER.");
  }

  try {
    // ── ÉTAPE 1 : Sauvegarde automatique avant suppression ──
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
      fcmTokens,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, username: true, role: true, langue: true,
        },
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
      prisma.fcmToken.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: "1.1",
      source: "auto-backup-reinitialisation",
      data: {
        users, parametres, lots, produits, ventes, reparations, mouvements,
        factures, factureLignes, journal, notifications, produitImages,
        historiqueStatuts, pushSubscriptions, fcmTokens,
      },
    };

    // ── ÉTAPE 2 : TRUNCATE ──
    // `facture_lignes` et `produit_images` sont listées explicitement :
    // leurs colonnes produit_id / vente_id sont dénormalisées (sans clé
    // étrangère vers produits/ventes), le CASCADE ne les atteindrait pas et
    // d'anciennes factures survivraient à la réinitialisation.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE notifications, mouvements_caisse, historique_statuts,
       reparations, facture_lignes, factures, produit_images, ventes, produits, lots
       RESTART IDENTITY CASCADE`
    );

    return NextResponse.json({
      ok: true,
      message: "Réinitialisation effectuée. La sauvegarde automatique est incluse dans la réponse.",
      backup: backupData,
    });
  } catch (e) {
    console.error("POST /api/admin/reinitialisation", e);
    return erreur(500, "Erreur lors de la réinitialisation des données.");
  }
}
