import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireTriProduits } from "@/lib/filtres-produits";
import {
  construireFiltresExport,
  construireParametresProduit,
  lireFormatFichier,
} from "@/lib/export-inventaire";
import { libelleStatut } from "@/lib/statuts";

function champCsv(valeur: any, separateur = ";"): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = String(valeur);
  const regex = new RegExp(`[${separateur}"\n\r]`);
  return regex.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

const MAP_COLONNES: Record<string, { label: string; extracteur: (p: any) => any }> = {
  code_interne: {
    label: "Code Interne",
    extracteur: (p) => p.code_interne,
  },
  reference: {
    label: "Désignation / Modèle",
    extracteur: (p) => p.reference,
  },
  categorie: {
    label: "Catégorie",
    extracteur: (p) => p.categorie,
  },
  statut: {
    label: "Statut",
    extracteur: (p) => libelleStatut(p.statut),
  },
  en_vitrine: {
    label: "En Vitrine",
    extracteur: (p) => (p.en_vitrine ? "Oui" : "Non"),
  },
  numero_serie: {
    label: "Numéro de Série (S/N)",
    extracteur: (p) => p.numero_serie || "—",
  },
  grade: {
    label: "Grade / État",
    extracteur: (p) => p.grade || "Grade A",
  },
  emplacement: {
    label: "Emplacement",
    extracteur: (p) => p.emplacement || "reserve",
  },
  prix_achat: {
    label: "Prix d'Achat (DA)",
    extracteur: (p) => p.prix_achat,
  },
  prix_vente_fixe: {
    label: "Prix de Vente Conseillé (DA)",
    extracteur: (p) => p.prix_vente_fixe ?? "—",
  },
  marge_estimee: {
    label: "Marge Estimée (DA)",
    extracteur: (p) =>
      p.prix_vente_fixe && p.prix_achat
        ? `${p.prix_vente_fixe - p.prix_achat} DA (${Math.round(((p.prix_vente_fixe - p.prix_achat) / p.prix_achat) * 100)}%)`
        : "—",
  },
  reparations: {
    label: "Frais Réparations (DA)",
    extracteur: (p) => p.reparations?.reduce((acc: number, r: any) => acc + (r.cout || 0), 0) || 0,
  },
  prix_vente_reel: {
    label: "Prix Vente Réel (DA)",
    extracteur: (p) => p.prix_vente_reel ?? "—",
  },
  date_vente: {
    label: "Date de Vente",
    extracteur: (p) => (p.date_vente ? new Date(p.date_vente).toISOString().slice(0, 10) : "—"),
  },
  lot_id: {
    label: "N° Arrivage / Lot",
    extracteur: (p) => (p.lot ? `Lot #${p.lot.id}` : "Sans arrivage"),
  },
  fournisseur: {
    label: "Fournisseur",
    extracteur: (p) => p.lot?.fournisseur || "—",
  },
  date_entree: {
    label: "Date d'Entrée",
    extracteur: (p) => new Date(p.lot?.date_entree || p.created_at).toISOString().slice(0, 10),
  },
  notes: {
    label: "Notes",
    extracteur: (p) => p.notes || "",
  },
};

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;

    // `format_fichier`, deliberately NOT `format`: `format` is a hardware
    // specification filter of the inventory screen, so reading it here both
    // destroyed that filter and fed "csv_excel" to the product search, which
    // matched nothing. See lib/export-inventaire.ts for the measurement.
    const format = lireFormatFichier(params);
    const colonnesParam = params.get("colonnes");

    const colonnesCles = colonnesParam
      ? colonnesParam.split(",").filter((k) => MAP_COLONNES[k])
      : Object.keys(MAP_COLONNES);

    // The export's own parameters are stripped before the product filter is
    // built, so that no control parameter can be read as a search term.
    const whereClause = construireFiltresExport(params);
    const orderByClause = construireTriProduits(construireParametresProduit(params));

    const produits = await prisma.produit.findMany({
      where: whereClause,
      orderBy: orderByClause,
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        statut: true,
        grade: true,
        emplacement: true,
        en_vitrine: true,
        numero_serie: true,
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

    const entetes = colonnesCles.map((k) => MAP_COLONNES[k]!.label);

    // 1. Export XLSX (Excel Natif)
    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      
      const donneesExcel = produits.map((p) => {
        const row: Record<string, any> = {};
        colonnesCles.forEach((k) => {
          row[MAP_COLONNES[k]!.label] = MAP_COLONNES[k]!.extracteur(p);
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(donneesExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="inventaire-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    }

    // 2. Export CSV (Point-virgule ou Virgule)
    const separateur = format === "csv_standard" ? "," : ";";
    
    const lignesCsv = produits.map((p) =>
      colonnesCles
        .map((k) => champCsv(MAP_COLONNES[k]!.extracteur(p), separateur))
        .join(separateur)
    );

    const contenuCsv = "\uFEFF" + [entetes.join(separateur), ...lignesCsv].join("\r\n");

    return new NextResponse(contenuCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventaire-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    console.error("GET /api/produits/export", e);
    return erreur(500, e.message || "Erreur lors de l'export.");
  }
}
