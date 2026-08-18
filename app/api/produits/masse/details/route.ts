import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const idsString = params.get("ids");
    if (!idsString) return erreur(400, "IDs manquants");

    const ids = idsString.split(",").map(Number).filter(id => !isNaN(id));
    
    if (ids.length === 0) return erreur(400, "IDs invalides");

    const produits = await prisma.produit.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        code_interne: true,
        reference: true,
        prix_vente_fixe: true,
        prix_vente_reel: true,
        statut: true
      }
    });

    const formatted = produits.map(p => ({
      id: p.id,
      code_interne: p.code_interne,
      reference: p.reference,
      prix_vente: p.statut === 'vendu' ? p.prix_vente_reel : p.prix_vente_fixe
    }));

    return NextResponse.json(formatted);
  } catch (e) {
    console.error("GET /api/produits/masse/details", e);
    return erreur(500, "Erreur lors du chargement des détails produits.");
  }
}
