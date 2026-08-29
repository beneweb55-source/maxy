// Parse snapshot CSV and compute precise category stats
import fs from 'fs';

const csv = fs.readFileSync('scratch/snapshot_produits.csv', 'utf-8');
const lines = csv.split('\n').slice(1).filter(l => l.trim());

const parCategorie = {};
const parRef = {};
let total = 0;

for (const line of lines) {
  // Parse CSV with quoted fields containing commas and escaped quotes
  const match = line.match(/^(\d+),"(.+)","(.+)"$/);
  if (!match) continue;
  const [, id, ref, cat] = match;
  total++;
  if (!parCategorie[cat]) parCategorie[cat] = [];
  parCategorie[cat].push({ id: Number(id), ref });
  
  const key = `${cat}|||${ref}`;
  if (!parRef[key]) parRef[key] = 0;
  parRef[key]++;
}

console.log(`TOTAL PRODUITS: ${total}\n`);

// Sort categories by count
const sorted = Object.entries(parCategorie)
  .sort((a, b) => b[1].length - a[1].length);

console.log('=== CATÉGORIES PAR VOLUME ===');
for (const [cat, prods] of sorted) {
  console.log(`${cat}: ${prods.length} produits`);
}

console.log(`\nNOMBRE DE CATÉGORIES DISTINCTES: ${sorted.length}`);

// Show all unique references per category
console.log('\n=== RÉFÉRENCES UNIQUES PAR CATÉGORIE ===');
for (const [cat, prods] of sorted) {
  const refs = {};
  for (const p of prods) {
    if (!refs[p.ref]) refs[p.ref] = 0;
    refs[p.ref]++;
  }
  console.log(`\n--- ${cat} (${prods.length} produits, ${Object.keys(refs).length} réf distinctes) ---`);
  for (const [ref, count] of Object.entries(refs).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}× ${ref}`);
  }
}
