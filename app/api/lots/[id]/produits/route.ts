import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { validerLignesProduits, MAX_QUANTITE_PRODUITS } from "@/lib/validation";
import { creerProduitsGroupes } from "@/lib/creation-produits";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { produits: produitsBruts, quantite } = (corps ?? {}) as {
    produits?: unknown;
    quantite?: unknown;
  };
  const validation = validerLignesProduits(produitsBruts);
  if (validation.erreur !== undefined) return erreur(400, validation.erreur);
  let lignes = validation.produits;

  // Mode « quantité » : le client envoie UNE ligne (photos incluses une seule
  // fois) + une quantité ; on la réplique côté serveur. Cela évite de dupliquer
  // les photos N fois dans le corps de la requête (limite de taille) pour un
  // ajout d'un même produit en grand nombre.
  if (quantite !== undefined) {
    const q = Number(quantite);
    if (!Number.isInteger(q) || q < 1) return erreur(400, "Quantité invalide.");
    if (lignes.length !== 1) {
      return erreur(400, "La quantité s'applique à un seul produit à la fois.");
    }
    const modele = lignes[0]!;
    const qty = Math.min(MAX_QUANTITE_PRODUITS, q);
    lignes = Array.from({ length: qty }, () => modele);
  } else if (lignes.length > MAX_QUANTITE_PRODUITS) {
    return erreur(400, `Maximum ${MAX_QUANTITE_PRODUITS} produits par ajout.`);
  }

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.statut_lot !== "en_cours_de_test") {
      return erreur(400, "Impossible d'ajouter des produits : le lot n'est plus en cours de test.");
    }

    await prisma.$transaction(
      (tx) => creerProduitsGroupes(tx, { lotId: lot.id, lignes, userId: user.id }),
      { timeout: 120000 }
    );

    return NextResponse.json({ ok: true, ajoutes: lignes.length }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lots/[id]/produits", e);
    return erreur(500, "Erreur lors de l'ajout des produits.");
  }
}
