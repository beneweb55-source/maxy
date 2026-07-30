// Exporte TOUTE la base vers un fichier JSON, sans pg_dump (via Prisma).
// Permet de changer d'hébergeur Postgres quand on le souhaite.
//
//   node scripts/exporter-donnees.mjs                 → sauvegarde-<date>.json
//   node scripts/exporter-donnees.mjs mon-export.json
//
// À lancer IDÉALEMENT APRÈS la migration des photos vers le stockage objet :
// le fichier ne contient alors que des URL courtes (quelques Mo au lieu de
// centaines), et l'export lui-même ne consomme presque aucun transfert.
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const sortie = process.argv[2] ?? `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });

// Ordre des parents vers les enfants : réutilisé tel quel à l'import.
const TABLES = [
  "user",
  "parametres",
  "lot",
  "produit",
  "produitImage",
  "vente",
  "reparation",
  "historiqueStatut",
  "mouvementCaisse",
  "notification",
  "facture",
  "factureLigne",
];

const donnees = {};
let total = 0;
for (const table of TABLES) {
  try {
    const lignes = await prisma[table].findMany();
    donnees[table] = lignes;
    total += lignes.length;
    console.log(`${table.padEnd(18)} ${lignes.length} ligne(s)`);
  } catch (e) {
    const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    // Une table absente (migration non appliquée) n'empêche pas l'export.
    console.warn(`${table.padEnd(18)} ignorée — ${m}`);
    donnees[table] = [];
  }
}

writeFileSync(
  sortie,
  JSON.stringify({ version: 1, exporte_le: new Date().toISOString(), donnees }, null, 2),
  "utf8"
);
const mo = (Buffer.byteLength(readFileSync(sortie)) / 1024 / 1024).toFixed(2);
console.log(`\n${total} ligne(s) exportées dans ${sortie} (${mo} Mo) ✅`);
console.log("Import vers une autre base : node scripts/importer-donnees.mjs " + sortie);

await prisma.$disconnect();
