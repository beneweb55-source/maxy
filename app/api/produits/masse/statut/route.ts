import { NextResponse, type NextRequest } from "next/server";
import type { StatutProduit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { STATUTS_PRODUIT } from "@/lib/statuts";
import { STATUTS_NOTE_OBLIGATOIRE } from "@/lib/transitions";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["technicien", "gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, statut, note } = (corps ?? {}) as { ids?: unknown; statut?: unknown; note?: unknown };
  
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  const produitIds = ids.map(Number);

  if (
    typeof statut !== "string" ||
    !(STATUTS_PRODUIT as readonly string[]).includes(statut)
  ) {
    return erreur(400, "Statut cible invalide.");
  }
  const cible = statut as StatutProduit;
  const noteTexte = typeof note === "string" ? note.trim() : "";

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

  try {
    const produits = await prisma.produit.findMany({ where: { id: { in: produitIds } } });
    if (produits.length !== produitIds.length) {
      return erreur(404, "Certains produits sont introuvables.");
    }

    const aMettreAJour = produits.filter((p) => p.statut !== cible);
    if (aMettreAJour.length === 0) {
      return NextResponse.json({ ok: true, message: "Les produits sont déjà dans ce statut." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.produit.updateMany({
        where: { id: { in: aMettreAJour.map((p) => p.id) } },
        data: { statut: cible },
      });
      
      const historiques = aMettreAJour.map((p) => ({
        produit_id: p.id,
        user_id: user.id,
        statut_avant: p.statut,
        statut_apres: cible,
        note: noteTexte || null,
      }));
      await tx.historiqueStatut.createMany({ data: historiques });
    });

    return NextResponse.json({ ok: true, ajournes: aMettreAJour.length });
  } catch (e) {
    console.error("POST /api/produits/masse/statut", e);
    return erreur(500, "Erreur lors du changement de statut en masse.");
  }
}
