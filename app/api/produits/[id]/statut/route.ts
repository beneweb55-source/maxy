import { NextResponse, type NextRequest } from "next/server";
import type { StatutProduit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { STATUTS_PRODUIT } from "@/lib/statuts";
import { verifierTransition } from "@/lib/state-machine";
import { STATUTS_NOTE_OBLIGATOIRE } from "@/lib/transitions";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["technicien", "gerant", "dev"]);
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
  const { statut, note, cout_reparation, description_reparation } = (corps ?? {}) as {
    statut?: unknown;
    note?: unknown;
    cout_reparation?: unknown;
    description_reparation?: unknown;
  };
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

    // Validation stricte via la State Machine
    const resTransition = verifierTransition(produit.statut, cible);
    if (!resTransition.valide) {
      return erreur(400, resTransition.erreur || "Transition non autorisée par le cycle de vie atelier.");
    }

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

      // Si un coût de réparation est fourni lors de la validation ou de la réparation
      if (typeof cout_reparation === "number" && cout_reparation > 0) {
        await tx.reparation.create({
          data: {
            produit_id: produit.id,
            user_id: user.id,
            cout: Math.round(cout_reparation),
            description: typeof description_reparation === "string" && description_reparation.trim()
              ? description_reparation.trim()
              : noteTexte || `Intervention transition ${produit.statut} -> ${cible}`,
          },
        });
      }

      await tx.historiqueStatut.create({
        data: {
          produit_id: produit.id,
          user_id: user.id,
          statut_avant: produit.statut,
          statut_apres: cible,
          note: noteTexte || null,
        },
      });

      // Audit Log
      await enregistrerActivite(tx, user.id, ACTIONS_JOURNAL.PRODUIT_STATUT, "produit", produit.id, { 
        statut_avant: produit.statut, 
        statut_apres: cible,
        cout_reparation: cout_reparation || undefined
      });

      return maj;
    });

    return NextResponse.json({ ok: true, statut: misAJour.statut });
  } catch (e: any) {
    console.error("POST /api/produits/[id]/statut", e);
    return erreur(500, e?.message || "Erreur lors du changement de statut.");
  }
}

