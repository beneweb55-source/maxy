import * as fs from "fs";
import * as path from "path";
import { products, classifyProduct } from "./test_full_classification";

// Build Before summary (Legacy)
const beforeStats: Record<string, { units: number, refs: Set<string> }> = {};
for (const p of products) {
  const cat = p.categorie.replace(/\u200B/g, '').trim();
  if (!beforeStats[cat]) beforeStats[cat] = { units: 0, refs: new Set() };
  beforeStats[cat].units++;
  beforeStats[cat].refs.add(p.reference);
}

// Build After summary (Target 3-level Taxonomy)
const afterStats: Record<string, Record<string, Record<string, { units: number, refs: Set<string> }>>> = {};
const movedProducts: Array<{ id: number; ref: string; oldCat: string; newFam: string; newCat: string; newSub: string; reason: string }> = [];

for (const p of products) {
  const res = classifyProduct(p);
  const f = res.famille;
  const c = res.categorie;
  const sc = res.sousCategorie;

  if (!afterStats[f]) afterStats[f] = {};
  if (!afterStats[f][c]) afterStats[f][c] = {};
  if (!afterStats[f][c][sc]) afterStats[f][c][sc] = { units: 0, refs: new Set() };

  afterStats[f][c][sc].units++;
  afterStats[f][c][sc].refs.add(p.reference);

  const oldCat = p.categorie.replace(/\u200B/g, '').trim();
  // Check if moved
  if (oldCat !== sc && oldCat !== c && oldCat !== f) {
    movedProducts.push({
      id: p.id,
      ref: p.reference,
      oldCat,
      newFam: f,
      newCat: c,
      newSub: sc,
      reason: `Reclassé depuis "${oldCat}" vers la branche hiérarchique appropriée [${f} > ${c} > ${sc}]`
    });
  }
}

const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch";

fs.writeFileSync(
  path.join(outDir, "before_after_summary.json"),
  JSON.stringify({ beforeStats, afterStats, totalBefore: products.length, totalAfter: products.length }, null, 2)
);

console.log("Before/After analysis generated.");
