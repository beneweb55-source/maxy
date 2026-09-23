/**
 * One-off: the showcase products, one line per product, with its real quantity.
 *
 * Rows are the models exposed in the vitrine (`en_vitrine = true`), grouped by
 * (reference, categorie) — the same model key the vitrine API uses.
 *
 * Quantite = EVERY identical unit still in stock in the database, whether or not
 * it is itself exposed, exactly as `app/api/vitrine/route.ts:82` computes it
 * (`memeModele.length`, statut != 'vendu'). It is NOT the number of exposed
 * units, and NOT `Modele.quantite` — that column is only filled for 61 of 538
 * models and reads 0 for products that plainly have stock.
 *
 * Read-only. Run: npx tsx scripts/export-vitrine-urgent.ts
 */
import * as XLSX from 'xlsx';
import { prisma } from '../lib/db';

type Unite = {
  id: number;
  reference: string;
  categorie: string;
  prix_achat: number;
  prix_vente_fixe: number | null;
};

/** Exactly the requested columns, in the requested order. Quantite last. */
const COLONNES: { label: string; largeur: number; valeur: (u: Unite, qte: number) => any }[] = [
  { label: 'Désignation', largeur: 58, valeur: (u) => u.reference },
  { label: 'Catégorie', largeur: 34, valeur: (u) => u.categorie },
  { label: "Prix d'achat", largeur: 15, valeur: (u) => u.prix_achat ?? null },
  { label: 'Prix de vente', largeur: 15, valeur: (u) => u.prix_vente_fixe ?? null },
  { label: 'Quantité', largeur: 12, valeur: (_u, qte) => qte },
];

/** The model key the vitrine API uses (app/api/vitrine/route.ts). */
const cle = (reference: string, categorie: string) =>
  `${reference.trim().toLowerCase()}|${categorie.trim().toLowerCase()}`;

async function main() {
  // 1. The exposed models — these become the rows, and carry the prices.
  const exposees: Unite[] = await prisma.produit.findMany({
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

  // 2. Every unit still in stock, sold ones excluded — the quantity source.
  //    Only the two key fields are transferred, never images.
  const enStock = await prisma.produit.findMany({
    where: { statut: { not: 'vendu' } },
    orderBy: [{ id: 'asc' }],
    select: { reference: true, categorie: true },
  });

  const stockParModele = new Map<string, number>();
  for (const p of enStock) {
    const k = cle(p.reference, p.categorie);
    stockParModele.set(k, (stockParModele.get(k) ?? 0) + 1);
  }

  // 3. Group the exposed units. `id: 'asc'` fixes the representative, so the
  //    prices are stable across runs.
  const groupes = new Map<string, Unite[]>();
  for (const u of exposees) {
    const k = cle(u.reference, u.categorie);
    const liste = groupes.get(k);
    if (liste) liste.push(u);
    else groupes.set(k, [u]);
  }

  const sansStock: string[] = [];
  const lignes = Array.from(groupes.entries())
    .map(([k, groupe]) => {
      const rep = groupe[0]!;
      const qte = stockParModele.get(k) ?? 0;
      if (qte === 0) sansStock.push(`${rep.reference} | ${rep.categorie}`);
      const row: Record<string, any> = {};
      for (const c of COLONNES) row[c.label] = c.valeur(rep, qte);
      return row;
    })
    .sort(
      (a, b) =>
        String(a['Catégorie']).localeCompare(String(b['Catégorie']), 'fr') ||
        String(a['Désignation']).localeCompare(String(b['Désignation']), 'fr')
    );

  const ws = XLSX.utils.json_to_sheet(lignes, { header: COLONNES.map((c) => c.label) });
  // `wch` = width in characters. The designation column is widened so the
  // product names are readable without resizing by hand.
  ws['!cols'] = COLONNES.map((c) => ({ wch: c.largeur }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vitrine');

  const nom = `vitrine-quantite-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, nom);

  const totalQte = lignes.reduce((a, r) => a + Number(r['Quantité']), 0);
  console.log(`fichier écrit      : ${nom}`);
  console.log(`unités exposées    : ${exposees.length}`);
  console.log(`lignes (modèles)   : ${lignes.length}`);
  console.log(`somme quantités    : ${totalQte}   (stock non vendu de ces modèles)`);
  console.log(`colonnes           : ${COLONNES.map((c) => c.label).join(' | ')}`);
  console.log(`largeurs           : ${COLONNES.map((c) => `${c.label}=${c.largeur}`).join(', ')}`);
  if (sansStock.length) {
    console.log(`\nATTENTION: ${sansStock.length} ligne(s) à quantité 0 (exposées mais plus en stock) :`);
    sansStock.forEach((s) => console.log(`  ${s}`));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('ÉCHEC:', e);
  await prisma.$disconnect();
  process.exit(1);
});
