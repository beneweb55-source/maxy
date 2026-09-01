import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { formaterDA } from "@/lib/caisse";
import { entierPositif } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, prix_vente_fixe } = (corps ?? {}) as { ids?: unknown; prix_vente_fixe?: unknown };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  const produitIds = ids.map(Number);

  const erreurPrix = entierPositif(prix_vente_fixe, "Le prix de vente");
  if (erreurPrix) return erreur(400, erreurPrix);
  const prix = prix_vente_fixe as number;

  try {
    const produits = await prisma.produit.findMany({ where: { id: { in: produitIds } } });
    if (produits.length !== produitIds.length) {
      return erreur(404, "Certains produits sont introuvables.");
    }
    
    if (produits.some(p => p.statut === "vendu" || p.statut === "hs")) {
      return erreur(400, "Un ou plusieurs produits sont vendus ou hors service.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.produit.updateMany({
        where: { id: { in: produitIds } },
        data: { prix_vente_fixe: prix, statut: "en_vente" },
      });
      
      const historiques = produits.map((p) => ({
        produit_id: p.id,
        user_id: user.id,
        statut_avant: p.statut,
        statut_apres: "en_vente" as const,
        note: `Prix fixé : ${formaterDA(prix)}`,
      }));
      await tx.historiqueStatut.createMany({ data: historiques });
    });

    return NextResponse.json({ ok: true, ajournes: produitIds.length });
  } catch (e) {
    console.error("POST /api/produits/masse/prix", e);
    return erreur(500, "Erreur lors de la fixation du prix en masse.");
  }
}
