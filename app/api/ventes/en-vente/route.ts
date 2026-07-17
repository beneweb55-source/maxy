import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const produits = await prisma.produit.findMany({
      where: { statut: "en_vente" },
      orderBy: { id: "asc" },
      include: {
        lot: { select: { date_entree: true } },
        reparations: { select: { cout: true } },
        historique: {
          where: { statut_apres: "en_vente" },
          orderBy: { created_at: "desc" },
          take: 1,
          select: { created_at: true },
        },
      },
    });
    const maintenant = Date.now();
    return NextResponse.json({
      produits: produits.map((p) => {
        const coutRep = p.reparations.reduce((s, r) => s + r.cout, 0);
        const depuis = p.historique.at(0)?.created_at ?? p.lot.date_entree;
        return {
          id: p.id,
          code_interne: p.code_interne,
          reference: p.reference,
          categorie: p.categorie,
          prix_achat: p.prix_achat,
          cout_reparations: coutRep,
          prix_vente_fixe: p.prix_vente_fixe,
          marge_prevue: (p.prix_vente_fixe ?? 0) - p.prix_achat - coutRep,
          jours_en_vente: Math.floor((maintenant - depuis.getTime()) / JOUR_MS),
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/ventes/en-vente", e);
    return erreur(500, "Erreur lors du chargement des produits en vente.");
  }
}
