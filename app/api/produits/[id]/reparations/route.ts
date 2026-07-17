import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { entierPositif } from "@/lib/validation";

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
  const { cout, description } = (corps ?? {}) as { cout?: unknown; description?: unknown };
  const erreurCout = entierPositif(cout, "Le coût de réparation");
  if (erreurCout) return erreur(400, erreurCout);
  if (typeof description !== "string" || !description.trim()) {
    return erreur(400, "La description de la réparation est obligatoire.");
  }

  try {
    const produit = await prisma.produit.findUnique({ where: { id: produitId } });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (produit.statut === "vendu") {
      return erreur(400, "Produit vendu : verrouillé, aucune modification possible (sauf notes).");
    }

    const reparation = await prisma.reparation.create({
      data: {
        produit_id: produit.id,
        user_id: user.id,
        cout: cout as number,
        description: description.trim(),
      },
    });
    return NextResponse.json({ ok: true, reparation_id: reparation.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/produits/[id]/reparations", e);
    return erreur(500, "Erreur lors de l'ajout de la réparation.");
  }
}
