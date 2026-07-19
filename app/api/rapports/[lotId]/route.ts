import { NextResponse } from "next/server";
import type { StatutProduit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { lotId: brut } = await params;
  const lotId = Number(brut);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        produits: {
          orderBy: { id: "asc" },
          include: {
            reparations: { select: { cout: true } },
            historique: {
              where: { note: { not: null } },
              orderBy: { created_at: "desc" },
              take: 1,
              select: { note: true },
            },
          },
        },
      },
    });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.statut_lot === "en_cours_de_test") {
      return erreur(400, "Le rapport n'existe pas encore : le lot est en cours de test.");
    }

    const parStatut = new Map<StatutProduit, { nombre: number; valeur_achat: number }>();
    const parCategorie = new Map<string, { nombre: number; valeur_achat: number }>();
    for (const p of lot.produits) {
      const s = parStatut.get(p.statut) ?? { nombre: 0, valeur_achat: 0 };
      s.nombre += 1;
      s.valeur_achat += p.prix_achat;
      parStatut.set(p.statut, s);
      const c = parCategorie.get(p.categorie) ?? { nombre: 0, valeur_achat: 0 };
      c.nombre += 1;
      c.valeur_achat += p.prix_achat;
      parCategorie.set(p.categorie, c);
    }

    return NextResponse.json({
      lot: {
        id: lot.id,
        fournisseur: lot.fournisseur,
        date_entree: lot.date_entree.toISOString(),
        statut_lot: lot.statut_lot,
        description: lot.description,
        cout_global_declare: lot.cout_global_declare,
      },
      resume_par_statut: Array.from(parStatut.entries()).map(([statut, v]) => ({
        statut,
        ...v,
      })),
      resume_par_categorie: Array.from(parCategorie.entries()).map(([categorie, v]) => ({
        categorie,
        ...v,
      })),
      produits: lot.produits.map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        categorie: p.categorie,
        statut: p.statut,
        prix_achat: p.prix_achat,
        prix_vente_fixe: p.prix_vente_fixe,
        cout_reparations: p.reparations.reduce((s, r) => s + r.cout, 0),
        decision_rapport: p.decision_rapport,
        derniere_note: p.historique.at(0)?.note ?? null,
      })),
    });
  } catch (e) {
    console.error("GET /api/rapports/[lotId]", e);
    return erreur(500, "Erreur lors du chargement du rapport.");
  }
}
