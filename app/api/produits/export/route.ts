import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireTriProduits } from "@/lib/filtres-produits";
import {
  FORMAT_MONNAIE,
  MAX_IDS_SELECTION,
  PARAM_COMPTE,
  colonnesMonnaie,
  construireFiltresExport,
  construireParametresProduit,
  construireTableau,
  largeursColonnes,
  lireColonnes,
  lireFormatFichier,
  lireIds,
  lireScope,
  separateurPour,
  serialiserCsv,
} from "@/lib/export-inventaire";

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
    const colonnesCles = lireColonnes(params);
    const scope = lireScope(params);

    // Ticking nothing is not "everything": it is an empty request. And a
    // selection too wide for the query string is refused HERE, with a message
    // naming the cause, rather than by the proxy with an opaque 414.
    if (scope === "selection") {
      const ids = lireIds(params);
      if (ids.length === 0) {
        return erreur(400, "Aucune ligne sélectionnée à exporter.");
      }
      if (ids.length > MAX_IDS_SELECTION) {
        return erreur(
          400,
          `Sélection trop large : ${ids.length} lignes (maximum ${MAX_IDS_SELECTION}). ` +
            `Filtrez l'inventaire puis exportez le périmètre « Filtres actuels ».`
        );
      }
    }

    // Le COMPTAGE du périmètre — ce que la carte « Filtres actuels uniquement »
    // annonce avant d'écrire quoi que ce soit. Le nombre vient d'ici, du même
    // `construireFiltresExport` que le fichier, donc il ne peut pas le
    // contredire. Il est calculé après les contrôles de périmètre ci-dessus
    // (une sélection vide reste refusée) et AVANT celui des colonnes : un
    // comptage ne produit aucun fichier, la liste des colonnes ne le concerne
    // pas. C'est la seule inversion d'ordre introduite ici, et elle ne change
    // qu'un cas : une requête à la fois sans colonne et sans sélection reçoit
    // désormais le refus de sélection, tout aussi exact.
    if (params.get(PARAM_COMPTE) === "1") {
      const total = await prisma.produit.count({ where: construireFiltresExport(params) });
      return NextResponse.json({ total });
    }

    // A request that names only unknown columns is an ERROR, not "all columns".
    // Without this refusal, `colonnes=nimportequoi` produced a file with an
    // empty header row — indistinguishable from a successful export, and the
    // reason a broken request could look like a broken filter.
    if (colonnesCles.length === 0) {
      return erreur(400, "Aucune colonne valide demandée. Sélectionnez au moins une colonne.");
    }

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

    // One pass over the rows, shared by both writers, so the CSV and the xlsx
    // cannot drift apart.
    const tableau = construireTableau(produits, colonnesCles);
    const nomFichier = `inventaire-${scope}-${new Date().toISOString().slice(0, 10)}`;

    // 1. Export XLSX (Excel Natif)
    if (format === "xlsx") {
      const XLSX = await import("xlsx");

      const worksheet = XLSX.utils.json_to_sheet(tableau.objets, { header: tableau.entetes });

      // Amounts stay NUMBERS (so they remain summable in Excel) and are only
      // DISPLAYED as dinars. The community build of SheetJS can write number
      // formats and column widths; it cannot write fonts, fills or frozen panes —
      // `write_ws_xml_cell` carries a `/* TODO: cell style */` and only the
      // READER handles `pane`. Promising a frozen header here would be promising
      // something the file cannot contain.
      for (const c of colonnesMonnaie(tableau.colonnesCles)) {
        for (let r = 1; r <= tableau.objets.length; r++) {
          const cellule = worksheet[XLSX.utils.encode_cell({ r, c })];
          if (cellule && typeof cellule.v === "number") cellule.z = FORMAT_MONNAIE;
        }
      }

      worksheet["!cols"] = largeursColonnes(tableau.colonnesCles);
      // NO `!autofilter`, deliberately. It was added as "the closest the
      // community writer gets to a pinned header", and that was the wrong trade:
      // it puts a dropdown arrow on all 18 headers, which is visual noise on a
      // file meant to be read, and a filter row that hides rows is a trap when
      // the file is also used as a stock listing. Excel offers its own filter in
      // one click (Data ▸ Filter) for anyone who wants it; the file no longer
      // imposes it. `lib/export-inventaire.test.ts` holds this, so restoring the
      // line without a decision will fail the suite.

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${nomFichier}.xlsx"`,
        },
      });
    }

    // 2. Export CSV (Point-virgule ou Virgule)
    const contenuCsv = serialiserCsv(tableau, separateurPour(format));

    return new NextResponse(contenuCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nomFichier}.csv"`,
      },
    });
  } catch (e) {
    // The raw message of a Prisma exception names tables and columns: it stays
    // in the server log, never in the response body.
    console.error("GET /api/produits/export", e);
    return erreur(500, "Erreur lors de la génération de l'export.");
  }
}
