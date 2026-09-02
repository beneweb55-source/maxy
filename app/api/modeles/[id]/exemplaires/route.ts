import { NextResponse, type NextRequest } from "next/server";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";

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
      reference,
      categorie,
    } = body;

    const resultat = await StockService.createExemplaires(user.id, {
      modeleId,
      reference: reference || "",
      categorie: categorie || "",
      quantite: Number(quantite) || 1,
      prix_achat: Number(prix_achat) || 0,
      prix_vente_fixe: prix_vente_fixe !== undefined ? Number(prix_vente_fixe) : null,
      lot_id: lot_id ? Number(lot_id) : null,
      grade,
      emplacement,
      numeros_serie,
      statut,
      en_vitrine: en_vitrine === true || emplacement === "vitrine",
    });

    return NextResponse.json(
      {
        ok: true,
        ajoutes: resultat.diff,
        codes: resultat.codesCrees,
        modele_nom: resultat.modeleNom,
        nouvelleQuantite: resultat.nouvelleQuantite,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/modeles/[id]/exemplaires", err);
    return erreur(400, err.message || "Erreur lors de l'ajout des exemplaires.");
  }
}
