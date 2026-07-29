import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireFiltresProduits, construireTriProduits } from "@/lib/filtres-produits";
import { libelleStatut } from "@/lib/statuts";

function champCsv(valeur: string | number | null): string {
  if (valeur === null) return "";
  const texte = String(valeur);
  return /[;"\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const produits = await prisma.produit.findMany({
      where: construireFiltresProduits(params),
      orderBy: construireTriProduits(params),
      // `select` explicite : l'export CSV ne contient aucune image, inutile de
      // rapatrier les photos base64 de tout le catalogue.
      select: {
        code_interne: true,
        reference: true,
        categorie: true,
        statut: true,
        prix_achat: true,
        prix_vente_fixe: true,
        prix_vente_reel: true,
        date_vente: true,
        notes: true,
        created_at: true,
        lot: { select: { id: true, fournisseur: true, date_entree: true } },
        reparations: { select: { cout: true } },
      },
    });

    const entetes = [
      "Code",
      "Référence",
      "Catégorie",
      "Statut",
      "Lot",
      "Fournisseur",
      "Date entrée",
      "Prix achat (DA)",
      "Réparations (DA)",
      "Prix vente fixé (DA)",
      "Prix vente réel (DA)",
      "Date vente",
      "Notes",
    ];
    const lignes = produits.map((p) =>
      [
        p.code_interne,
        p.reference,
        p.categorie,
        libelleStatut(p.statut),
        p.lot ? `n°${p.lot.id}` : "Sans arrivage",
        p.lot?.fournisseur ?? "—",
        (p.lot?.date_entree ?? p.created_at).toISOString().slice(0, 10),
        p.prix_achat,
        p.reparations.reduce((s, r) => s + r.cout, 0),
        p.prix_vente_fixe,
        p.prix_vente_reel,
        p.date_vente ? p.date_vente.toISOString().slice(0, 10) : null,
        p.notes,
      ]
        .map(champCsv)
        .join(";")
    );
    const csv = "﻿" + [entetes.join(";"), ...lignes].join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventaire-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("GET /api/produits/export", e);
    return erreur(500, "Erreur lors de l'export CSV.");
  }
}
