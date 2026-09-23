/**
 * The vitrine products as a flat Excel list: FOUR columns, nothing else.
 *
 * Requested verbatim: « les produits de la vitrine en fichier excel ... uniquement
 * les colonnes suivantes : Désignation (agrandir sa taille pour que le nom des
 * produits soit plus visible) / Catégorie / Prix d'achat / Prix de vente —
 * rien d'autre pour les colonnes ».
 *
 * One line per unit exposed in the vitrine (`en_vitrine = true`), which is the
 * set `app/api/vitrine/route.ts` selects. The designation column is widened to
 * 58 characters so product names are readable without resizing by hand.
 *
 * Sorted by category then designation, so the listing can be read top to bottom.
 *
 * Read-only. Run: npx tsx scripts/export-vitrine-4-colonnes.ts
 */
import * as XLSX from 'xlsx';
import { prisma } from '../lib/db';

/** Exactly the four requested columns, in the requested order. */
const COLONNES: { label: string; largeur: number; valeur: (p: any) => any }[] = [
  // 86 = the longest designation in the vitrine (85 chars) plus one, so NO name
  // is clipped. Measured, not guessed: a narrower column would silently hide the
  // tail of the longest product names.
  { label: 'Désignation', largeur: 86, valeur: (p) => p.reference },
  { label: 'Catégorie', largeur: 34, valeur: (p) => p.categorie },
  { label: "Prix d'achat", largeur: 15, valeur: (p) => p.prix_achat ?? null },
  { label: 'Prix de vente', largeur: 15, valeur: (p) => p.prix_vente_fixe ?? null },
];

async function main() {
  const produits = await prisma.produit.findMany({
    where: { en_vitrine: true },
    orderBy: [{ id: 'asc' }],
    select: {
      id: true,
      reference: true,
      categorie: true,
      prix_achat: true,
      prix_vente_fixe: true,
    },
  });

  const lignes = produits
    .map((p) => {
      const row: Record<string, any> = {};
      for (const c of COLONNES) row[c.label] = c.valeur(p);
      return row;
    })
    .sort(
      (a, b) =>
        String(a['Catégorie']).localeCompare(String(b['Catégorie']), 'fr') ||
        String(a['Désignation']).localeCompare(String(b['Désignation']), 'fr')
    );

  const ws = XLSX.utils.json_to_sheet(lignes, { header: COLONNES.map((c) => c.label) });
  // `wch` = column width in characters. This is what widens Désignation.
  ws['!cols'] = COLONNES.map((c) => ({ wch: c.largeur }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vitrine');

  const nom = `vitrine-designation-prix-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, nom);

  console.log(`fichier  : ${nom}`);
  console.log(`lignes   : ${lignes.length}`);
  console.log(`colonnes : ${COLONNES.map((c) => c.label).join(' | ')}`);
  console.log(`largeurs : ${COLONNES.map((c) => `${c.label}=${c.largeur}`).join(', ')}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ÉCHEC:', e);
  await prisma.$disconnect();
  process.exit(1);
});
