import * as fs from "fs";
import * as path from "path";

const csvPath = "c:\\Users\\ASUS\\OneDrive\\Desktop\\SOLMAXY\\maxy\\scratch\\snapshot_produits.csv";
const content = fs.readFileSync(csvPath, "utf8");

const lines = content.split(/\r?\n/).filter(Boolean);
console.log(`Total lines in CSV: ${lines.length}`);

interface ProductRow {
  id: number;
  reference: string;
  categorie: string;
}

const products: ProductRow[] = [];
// Parse CSV (handling quotes)
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(\d+),"(.*)","(.*)"$/);
  if (match) {
    products.push({
      id: parseInt(match[1], 10),
      reference: match[2].replace(/""/g, '"'),
      categorie: match[3].replace(/""/g, '"'),
    });
  } else {
    // Simple split if no complex quotes
    const parts = line.split(",");
    if (parts.length >= 3) {
      products.push({
        id: parseInt(parts[0], 10),
        reference: parts.slice(1, parts.length - 1).join(",").replace(/^"|"$/g, '').replace(/""/g, '"'),
        categorie: parts[parts.length - 1].replace(/^"|"$/g, '').replace(/""/g, '"'),
      });
    }
  }
}

console.log(`Parsed ${products.length} products.`);

// Group by reference + categorie
const groups = new Map<string, { reference: string; categorie: string; count: number; ids: number[] }>();
for (const p of products) {
  const key = `${p.reference} ||| ${p.categorie}`;
  if (!groups.has(key)) {
    groups.set(key, { reference: p.reference, categorie: p.categorie, count: 0, ids: [] });
  }
  const g = groups.get(key)!;
  g.count++;
  g.ids.push(p.id);
}

console.log(`Unique reference+category pairs: ${groups.size}`);

// Write summary to scratch
const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch";
fs.writeFileSync(path.join(outDir, "csv_products_parsed.json"), JSON.stringify(products, null, 2));
fs.writeFileSync(path.join(outDir, "csv_groups_summary.json"), JSON.stringify(Array.from(groups.values()), null, 2));

console.log("Analysis written to scratch folder.");
