import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { creerProduitsGroupes } from "@/lib/creation-produits";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import type { StatutProduit } from "@prisma/client";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { id } = await context.params;
    const modeleId = Number(id);
    if (!Number.isInteger(modeleId)) return erreur(400, "Identifiant de modèle invalide.");

    const modele = await prisma.modele.findUnique({
      where: { id: modeleId },
      include: { categorie: true },
    });
    if (!modele) return erreur(404, "Modèle introuvable.");

    const body = await request.json();
    const {
      quantite = 1,
      prix_achat,
      prix_vente_fixe,
      lot_id,
      grade,
      emplacement = "reserve",
      numeros_serie = [],
      statut = "recu",
      en_vitrine = false,
      notes,
    } = body as {
      quantite?: number;
      prix_achat?: number;
      prix_vente_fixe?: number | null;
      lot_id?: number | null;
      grade?: string | null;
      emplacement?: string;
      numeros_serie?: string[];
      statut?: StatutProduit;
      en_vitrine?: boolean;
      notes?: string | null;
    };

    const qty = Math.max(1, Math.min(500, Number(quantite) || 1));
    const prixAchatNum = Number(prix_achat) || 0;
    const prixVenteNum = prix_vente_fixe ? Number(prix_vente_fixe) : modele.prix_vente_conseille;

    // Préparer les lignes pour chaque exemplaire
    const lignes = Array.from({ length: qty }, (_, i) => ({
      reference: modele.nom,
      categorie: modele.categorie.nom,
      modele_id: modele.id,
      categorie_id: modele.categorie_id,
      numero_serie: Array.isArray(numeros_serie) && numeros_serie[i] ? numeros_serie[i].trim() : null,
      grade: grade || "Grade A",
      emplacement: en_vitrine ? "vitrine" : (emplacement || "reserve"),
      prix_achat: prixAchatNum,
      prix_vente_fixe: prixVenteNum,
      image_url: modele.image_url || undefined,
      images: modele.image_url ? [modele.image_url] : [],
    }));

    const codes = await prisma.$transaction(
      (tx) =>
        creerProduitsGroupes(tx, {
          lotId: lot_id ? Number(lot_id) : null,
          lignes,
          userId: user.id,
          statut: (statut as StatutProduit) || "recu",
          enVitrine: en_vitrine === true || emplacement === "vitrine",
        }),
      { timeout: 120000 }
    );

    // Audit log
    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.PRODUIT_AJOUTER,
      "lot",
      lot_id ? Number(lot_id) : undefined,
      {
        modele_id: modele.id,
        modele_nom: modele.nom,
        quantite: qty,
        codes,
      }
    );

    return NextResponse.json(
      { ok: true, ajoutes: qty, codes, modele_nom: modele.nom },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/modeles/[id]/exemplaires", err);
    return erreur(500, "Erreur lors de l'ajout des exemplaires.");
  }
}
