// Importe une sauvegarde produite par exporter-donnees.mjs dans une base
// Postgres VIDE (nouvel hébergeur). Prisma étant agnostique, il suffit de
// pointer DATABASE_URL vers la nouvelle base.
//
//   1. Créez la base chez le nouvel hébergeur, mettez son URL dans .env
//   2. npx prisma db push          (crée le schéma)
//   3. node scripts/importer-donnees.mjs sauvegarde-2026-07-30.json
//
// Refuse d'écrire si la base contient déjà des données (sauf --forcer).
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const fichier = process.argv[2];
const FORCER = process.argv.includes("--forcer");
if (!fichier) {
  console.error("Usage : node scripts/importer-donnees.mjs <sauvegarde.json> [--forcer]");
  process.exit(1);
}

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });
console.log("Base cible :", url?.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@"));

const brut = JSON.parse(readFileSync(fichier, "utf8"));
const donnees = brut.donnees ?? brut;

// Parents d'abord : les clés étrangères doivent pouvoir être satisfaites.
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

// Correspondance modèle Prisma → table SQL, pour la remise à zéro des séquences.
const TABLE_SQL = {
  user: "users",
  parametres: "parametres",
  lot: "lots",
  produit: "produits",
  produitImage: "produit_images",
  vente: "ventes",
  reparation: "reparations",
  historiqueStatut: "historique_statuts",
  mouvementCaisse: "mouvements_caisse",
  notification: "notifications",
  facture: "factures",
  factureLigne: "facture_lignes",
};

const dejaPresent = await prisma.user.count();
if (dejaPresent > 0 && !FORCER) {
  console.error(
    `\nLa base cible contient déjà ${dejaPresent} utilisateur(s). Import annulé.\n` +
      "Relancez avec --forcer si vous voulez vraiment écrire par-dessus."
  );
  process.exit(1);
}

// Les dates sont sérialisées en chaînes ISO : on les reconvertit.
const RE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
function revivifier(ligne) {
  const sortie = {};
  for (const [cle, valeur] of Object.entries(ligne)) {
    sortie[cle] = typeof valeur === "string" && RE_ISO.test(valeur) ? new Date(valeur) : valeur;
  }
  return sortie;
}

let total = 0;
for (const table of TABLES) {
  const lignes = (donnees[table] ?? []).map(revivifier);
  if (lignes.length === 0) {
    console.log(`${table.padEnd(18)} —`);
    continue;
  }
  // Par paquets : évite une requête surdimensionnée.
  const PAQUET = 200;
  for (let i = 0; i < lignes.length; i += PAQUET) {
    await prisma[table].createMany({
      data: lignes.slice(i, i + PAQUET),
      skipDuplicates: true,
    });
  }
  total += lignes.length;
  console.log(`${table.padEnd(18)} ${lignes.length} ligne(s) importées`);
}

// Les identifiants sont réinsérés tels quels : il faut avancer les séquences
// auto-incrémentées, sinon la prochaine création provoquerait un conflit de clé.
console.log("\nRecalage des séquences…");
for (const [modele, tableSql] of Object.entries(TABLE_SQL)) {
  if ((donnees[modele] ?? []).length === 0) continue;
  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tableSql}"', 'id'),
         GREATEST((SELECT COALESCE(MAX(id), 1) FROM "${tableSql}"), 1))`
    );
  } catch (e) {
    const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.warn(`  ${tableSql} : séquence non recalée — ${m}`);
  }
}

console.log(`\n${total} ligne(s) importées ✅`);
console.log("Vérifiez ensuite : node scripts/verifier-base.mjs");
await prisma.$disconnect();
