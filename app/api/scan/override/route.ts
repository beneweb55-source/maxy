import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { estEligibleOverrideVente } from "@/lib/state-machine";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import { entierPositifOuNul } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête JSON invalide.");
  }

  const { produit_id, prix_vente_fixe, motif } = (corps ?? {}) as {
    produit_id?: unknown;
    prix_vente_fixe?: unknown;
    motif?: unknown;
  };

  const produitId = Number(produit_id);
  if (!Number.isInteger(produitId)) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  const errPrix = entierPositifOuNul(prix_vente_fixe, "Le prix de vente");
  if (errPrix) {
    return erreur(400, errPrix);
  }

  const nouveauPrix = Number(prix_vente_fixe);

  try {
    const resultat = await prisma.$transaction(async (tx) => {
      const produit = await tx.produit.findUnique({
        where: { id: produitId },
      });

      if (!produit) {
        throw new Error("Produit introuvable.");
      }

      if (!estEligibleOverrideVente(produit.statut)) {
        throw new Error(
          `Impossible de forcer la mise en vente : l'article est actuellement « ${produit.statut} » (seuls les statuts de stock atelier sont éligibles).`
        );
      }

      const statutAvant = produit.statut;

      // Mise à jour atomique vers EN_VENTE avec prix fixé
      const produitMisAJour = await tx.produit.update({
        where: { id: produit.id },
        data: {
          statut: "en_vente",
          prix_vente_fixe: nouveauPrix,
          en_vitrine: produit.en_vitrine,
        },
      });

      // Historisation du changement d'état
      await tx.historiqueStatut.create({
        data: {
          produit_id: produit.id,
          user_id: user.id,
          statut_avant: statutAvant,
          statut_apres: "en_vente",
          note: `Auto-Correction POS / Override : passage forcé en vente à ${nouveauPrix} DA${motif ? ` (${motif})` : ""}`,
        },
      });

      // Audit log journal
      await enregistrerActivite(
        tx,
        user.id,
        ACTIONS_JOURNAL.PRODUIT_MODIFIER,
        "produit",
        produit.id,
        {
          action: "override_en_vente",
          statut_avant: statutAvant,
          statut_apres: "en_vente",
          prix_vente_fixe: nouveauPrix,
        }
      );

      return produitMisAJour;
    });

    return NextResponse.json({
      ok: true,
      message: `L'exemplaire ${resultat.code_interne} a été forcé en vente avec succès à ${nouveauPrix} DA.`,
      produit: {
        id: resultat.id,
        code_interne: resultat.code_interne,
        reference: resultat.reference,
        categorie: resultat.categorie,
        numero_serie: resultat.numero_serie,
        grade: resultat.grade,
        emplacement: resultat.emplacement,
        statut: resultat.statut,
        prix_achat: resultat.prix_achat,
        prix_vente_fixe: resultat.prix_vente_fixe,
        prix_vente_reel: resultat.prix_vente_reel,
        etiquette_imprimee: resultat.etiquette_imprimee,
      },
    });
  } catch (e: any) {
    console.error("POST /api/scan/override error:", e);
    return erreur(500, e?.message || "Erreur lors du forçage de la mise en vente.");
  }
}
