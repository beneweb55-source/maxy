import * as fs from "fs";
import * as path from "path";
import { products, classifyProduct } from "./test_full_classification";

const classifiedTree: Record<string, Record<string, Record<string, Array<{ id: number; ref: string; oldCat: string }>>>> = {};

for (const p of products) {
  const res = classifyProduct(p);
  const f = res.famille;
  const c = res.categorie;
  const sc = res.sousCategorie;

  if (!classifiedTree[f]) classifiedTree[f] = {};
  if (!classifiedTree[f][c]) classifiedTree[f][c] = {};
  if (!classifiedTree[f][c][sc]) classifiedTree[f][c][sc] = [];

  classifiedTree[f][c][sc].push({ id: p.id, ref: p.reference, oldCat: p.categorie });
}

let fullAudit = "# AUDIT EXHAUSTIF DE TOUS LES PRODUITS PAR SOUS-CATÉGORIE CIBLE\n\n";

for (const [famille, cats] of Object.entries(classifiedTree)) {
  fullAudit += `\n# 🏛️ FAMILLE : ${famille}\n`;
  for (const [cat, sousCats] of Object.entries(cats)) {
    fullAudit += `\n## 📁 CATÉGORIE : ${cat}\n`;
    for (const [sc, items] of Object.entries(sousCats)) {
      // Group identical references
      const refMap = new Map<string, { count: number; oldCats: Set<string>; ids: number[] }>();
      for (const it of items) {
        if (!refMap.has(it.ref)) {
          refMap.set(it.ref, { count: 0, oldCats: new Set(), ids: [] });
        }
        const r = refMap.get(it.ref)!;
        r.count++;
        r.oldCats.add(it.oldCat);
        r.ids.push(it.id);
      }

      fullAudit += `\n### 🏷️ SOUS-CATÉGORIE : ${sc} (${items.length} unités | ${refMap.size} références)\n`;
      for (const [ref, data] of refMap.entries()) {
        fullAudit += `- (${data.count}x) **${ref}** [Ancienne cat: ${Array.from(data.oldCats).join(', ')}]\n`;
      }
    }
  }
}

const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch";
fs.writeFileSync(path.join(outDir, "full_audit_by_subcategory.md"), fullAudit, "utf8");

console.log("Full audit by subcategory generated.");
