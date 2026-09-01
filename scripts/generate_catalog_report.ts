import * as fs from "fs";
import * as path from "path";

const summaryPath = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch\\csv_groups_summary.json";
const groups: Array<{ reference: string; categorie: string; count: number; ids: number[] }> = JSON.parse(
  fs.readFileSync(summaryPath, "utf8")
);

// Group by current legacy category and print each item
const categorized = new Map<string, Array<{ reference: string; count: number; ids: number[] }>>();
for (const g of groups) {
  const cat = g.categorie.replace(/\u200B/g, '').trim();
  if (!categorized.has(cat)) {
    categorized.set(cat, []);
  }
  categorized.get(cat)!.push({ reference: g.reference, count: g.count, ids: g.ids });
}

let report = "# INVENTORY COMPREHENSIVE PRODUCT AUDIT BY CURRENT CATEGORY\n\n";

for (const [cat, items] of Array.from(categorized.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
  const totalUnits = items.reduce((s, it) => s + it.count, 0);
  report += `## [${totalUnits} unités | ${items.length} refs] ${cat}\n`;
  for (const it of items) {
    report += `- (${it.count}x) ${it.reference}\n`;
  }
  report += "\n";
}

const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch";
fs.writeFileSync(path.join(outDir, "full_product_catalog_raw.md"), report, "utf8");

console.log(`Report generated with ${categorized.size} categories and ${groups.length} references.`);
