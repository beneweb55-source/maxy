import * as fs from "fs";
import * as path from "path";

const summaryPath = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch\\csv_groups_summary.json";
const groups: Array<{ reference: string; categorie: string; count: number; ids: number[] }> = JSON.parse(
  fs.readFileSync(summaryPath, "utf8")
);

console.log(`Analyzing ${groups.length} unique product groups representing ${groups.reduce((s, g) => s + g.count, 0)} total physical units...`);

// Let's print all distinct categories currently present in legacy/current snapshot
const legacyCategories = new Map<string, { count: number, refs: number }>();
for (const g of groups) {
  if (!legacyCategories.has(g.categorie)) {
    legacyCategories.set(g.categorie, { count: 0, refs: 0 });
  }
  const lc = legacyCategories.get(g.categorie)!;
  lc.count += g.count;
  lc.refs++;
}

console.log("\n=== DISTINCT LEGACY CATEGORIES ===");
for (const [cat, info] of Array.from(legacyCategories.entries()).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`[${info.count} unités | ${info.refs} refs] ${cat}`);
}
