import { NextResponse, type NextRequest } from "next/server";
import type { StatutProduit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { STATUTS_PRODUIT } from "@/lib/statuts";
import { STATUTS_NOTE_OBLIGATOIRE } from "@/lib/transitions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["technicien", "gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { statut, note } = (corps ?? {}) as { statut?: unknown; note?: unknown };
  if (
    typeof statut !== "string" ||
    !(STATUTS_PRODUIT as readonly string[]).includes(statut)
  ) {
    return erreur(400, "Statut cible invalide.");
  }
  const cible = statut as StatutProduit;
  const noteTexte = typeof note === "string" ? note.trim() : "";

  try {
    const produit = await prisma.produit.findUnique({ where: { id: produitId } });
    if (!produit) return erreur(404, "Produit introuvable.");

    // Changement de statut libre depuis l'inventaire : toute transition est
    // acceptée et tracée dans l'historique. Seule contrainte conservée : une
    // note obligatoire pour les statuts de défaut.
    if (produit.statut === cible) {
      return erreur(400, "Le produit est déjà dans ce statut.");
    }
    if (STATUTS_NOTE_OBLIGATOIRE.includes(cible) && !noteTexte) {
      return erreur(
        400,
        cible === "a_reparer"
          ? "Note obligatoire : décrivez le défaut à réparer."
          : cible === "manque_piece"
            ? "Note obligatoire : précisez la pièce manquante."
            : "Note obligatoire : expliquez pourquoi le produit est HS."
      );
    }

    const misAJour = await prisma.$transaction(async (tx) => {
      const maj = await tx.produit.update({
        where: { id: produit.id },
        data: { statut: cible },
      });
      await tx.historiqueStatut.create({
        data: {
          produit_id: produit.id,
          user_id: user.id,
          statut_avant: produit.statut,
          statut_apres: cible,
          note: noteTexte || null,
        },
      });
      return maj;
    });

    return NextResponse.json({ ok: true, statut: misAJour.statut });
  } catch (e) {
    console.error("POST /api/produits/[id]/statut", e);
    return erreur(500, "Erreur lors du changement de statut.");
  }
}
