import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

/** Garde-fou : une requête d'impression ne doit pas charger l'inventaire entier. */
const MAX_PRODUITS = 500;

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;

    // Deux entrées possibles pour la même page d'impression :
    //  - ids   : sélection depuis l'inventaire / la caisse
    //  - codes : impression directe après création au terrain (codes internes)
    const ids = (params.get("ids") || "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    const codes = (params.get("codes") || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (ids.length === 0 && codes.length === 0) return erreur(400, "IDs manquants");
    if (ids.length > MAX_PRODUITS || codes.length > MAX_PRODUITS) {
      return erreur(400, `Trop de produits demandés (maximum ${MAX_PRODUITS}).`);
    }

    const produits = await prisma.produit.findMany({
      where: {
        OR: [
          ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
          ...(codes.length > 0 ? [{ code_interne: { in: codes } }] : []),
        ],
      },
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        numero_serie: true,
        grade: true,
        prix_vente_fixe: true,
        prix_vente_reel: true,
        statut: true,
        modele: { select: { nom: true } },
      },
    });

    const parId = new Map(produits.map((p) => [p.id, p]));
    const parCode = new Map(produits.map((p) => [p.code_interne, p]));

    // Ordre de sortie = ordre demandé (donc l'ordre de sélection / de création),
    // dédoublonné : une étiquette par produit, pas une par entrée répétée.
    const ordonnes = [
      ...ids.map((id) => parId.get(id)),
      ...codes.map((code) => parCode.get(code)),
    ].filter((p): p is (typeof produits)[number] => p !== undefined);

    const vus = new Set<number>();
    const formatted: Array<{
      id: number;
      code_interne: string;
      reference: string;
      designation: string | null;
      categorie: string | null;
      numero_serie: string | null;
      grade: string | null;
      prix_vente: number | null;
    }> = [];

    for (const p of ordonnes) {
      if (vus.has(p.id)) continue;
      vus.add(p.id);
      formatted.push({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        // Nom lisible du modèle : c'est ce que l'étiquette doit montrer en clair.
        designation: p.modele?.nom || null,
        categorie: p.categorie || null,
        numero_serie: p.numero_serie,
        grade: p.grade,
        prix_vente: p.statut === "vendu" ? p.prix_vente_reel : p.prix_vente_fixe,
      });
    }

    return NextResponse.json(formatted);
  } catch (e) {
    console.error("GET /api/produits/masse/details", e);
    return erreur(500, "Erreur lors du chargement des détails produits.");
  }
}
