import fs from "fs";

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // This is a naive split, but looking at the data, the reference is quoted
    // We can use a regex to parse CSV properly
    const regex = /"([^"]*)"/g;
    const matches = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      matches.push(match[1]);
    }
    
    if (matches.length >= 3) {
      const idStr = line.split(',')[0].trim();
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        rows.push({
          id,
          reference: matches[0], // matches[0] is the second column because id doesn't have quotes in our regex, wait.
          categorie: matches[1]
        });
      }
    } else {
       // if no quotes used
       const parts = line.split(',');
       if (parts.length >= 3) {
          const id = parseInt(parts[0], 10);
          if (!isNaN(id)) {
            rows.push({
               id,
               reference: parts[1],
               categorie: parts[2]
            });
          }
       }
    }
  }
  return rows;
}

// A better CSV parser
function betterParseCSV(content) {
  const lines = content.trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Format is like: 1664,"HPE 300GB — SAS 10K — avec caddy","SAS — 2,5"" — 300GB / 146GB"
    const firstComma = line.indexOf(',');
    const id = parseInt(line.substring(0, firstComma), 10);
    
    const rest = line.substring(firstComma + 1);
    // Find the split between reference and categorie.
    // Both are wrapped in quotes. Reference is the first quoted string.
    let refStart = rest.indexOf('"');
    let refEnd = -1;
    for (let j = refStart + 1; j < rest.length; j++) {
      if (rest[j] === '"') {
        // check if next is quote (escaped)
        if (rest[j+1] === '"') {
          j++; // skip escaped quote
        } else {
          refEnd = j;
          break;
        }
      }
    }
    
    let reference = rest.substring(refStart + 1, refEnd).replace(/""/g, '"');
    
    if (!isNaN(id) && reference) {
      rows.push({ id, reference });
    }
  }
  return rows;
}


async function main() {
  const csvContent = fs.readFileSync("scratch/snapshot_produits.csv", "utf8");
  const data = betterParseCSV(csvContent);

  let sqlOutput = "-- SCRIPT DE RESTAURATION CHIRURGICALE DEPUIS SNAPSHOT NEON\\n";
  sqlOutput += "-- Ce script restaure l'ancienne référence exacte pour tous les produits sans toucher à leur nouvelle classification.\\n\\n";
  sqlOutput += "BEGIN;\\n\\n";

  let count = 0;
  for (const row of data) {
    const escapedRef = row.reference.replace(/'/g, "''");
    sqlOutput += "UPDATE produits SET reference = '" + escapedRef + "' WHERE id = " + row.id + ";\n";
    count++;
  }

  sqlOutput += "\\nCOMMIT;\\n";

  fs.writeFileSync("scratch/neon_restoration.sql", sqlOutput);
  console.log("✅ Terminé ! " + count + " requêtes UPDATE générées dans scratch/neon_restoration.sql");
}

main();
