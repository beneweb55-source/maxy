import * as fs from "fs";

const csvPath = "c:\\Users\\ASUS\\OneDrive\\Desktop\\SOLMAXY\\maxy\\scratch\\snapshot_produits.csv";
const content = fs.readFileSync(csvPath, "utf8");
const lines = content.split(/\r?\n/).filter(Boolean);

interface ProductRow {
  id: number;
  reference: string;
  categorie: string;
}

const products: ProductRow[] = [];
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

import { PrismaClient } from "@prisma/client";

// Let's import test_full_classification logic
// Let's write the check
function classify(ref: string, cat: string) {
  const fullText = `${ref} ${cat}`.toLowerCase();
  // We will run the exact classifier from test_full_classification.ts
}

