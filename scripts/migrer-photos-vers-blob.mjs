// Déplace les photos historiques (base64 en base) vers le stockage objet.
// La base ne conserve alors que des URL courtes : plus aucun méga-octet
// d'image ne transite depuis Postgres.
//
//   node scripts/migrer-photos-vers-blob.mjs            (à blanc, n'écrit rien)
//   node scripts/migrer-photos-vers-blob.mjs --appliquer
//
// Reprend là où il s'est arrêté : relançable sans risque.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const APPLIQUER = process.argv.includes("--appliquer");
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const lire = (cle) => /^([A-Z_]+)=(.*)$/gm && new RegExp(`^${cle}=(.+)$`, "m").exec(env)?.[1]?.trim();

const url = lire("DATABASE_URL");
const jeton = process.env.BLOB_READ_WRITE_TOKEN || lire("BLOB_READ_WRITE_TOKEN");
if (!jeton) {
  console.error(
    "BLOB_READ_WRITE_TOKEN manquant.\n" +
      "Créez un store Blob sur vercel.com (Storage → Blob), copiez le jeton,\n" +
      "puis ajoutez-le au .env local ET aux variables d'environnement Vercel."
  );
  process.exit(1);
}
const prisma = new PrismaClient({ datasourceUrl: url });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const MOTIF = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

async function reessais(fn, quoi) {
  for (let t = 1; t <= 5; t++) {
    try {
      return await fn();
    } catch (e) {
      const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
      console.error(`  ${quoi} — tentative ${t} : ${m}`);
      if (t === 5) throw e;
      await attendre(4000);
    }
  }
}

async function televerser(dataUrl, prefixe) {
  const trouve = MOTIF.exec(dataUrl);
  if (!trouve) return null;
  const [, mime, base64] = trouve;
  const octets = Buffer.from(base64, "base64");
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const res = await put(`${prefixe}/photo.${ext}`, octets, {
    access: "public",
    contentType: mime,
    addRandomSuffix: true,
    token: jeton,
  });
  return { url: res.url, octets: octets.length };
}

console.log(APPLIQUER ? "MODE RÉEL — la base sera modifiée." : "MODE À BLANC — aucune écriture.\n");

let totalOctets = 0;
let nbCouvertures = 0;
let nbGalerie = 0;

// 1) Couvertures (produits.image_url)
const produits = await reessais(
  () =>
    prisma.$queryRawUnsafe(
      `SELECT id, image_url FROM produits
       WHERE image_url IS NOT NULL AND image_url NOT LIKE 'http%'
       ORDER BY id`
    ),
  "lecture couvertures"
);
console.log(`Couvertures à migrer : ${produits.length}`);
for (const p of produits) {
  if (!APPLIQUER) {
    const t = MOTIF.exec(p.image_url);
    if (t) totalOctets += Buffer.from(t[2], "base64").length;
    nbCouvertures++;
    continue;
  }
  const res = await reessais(() => televerser(p.image_url, `produits/${p.id}`), `produit ${p.id}`);
  if (!res) continue;
  await reessais(
    () => prisma.produit.update({ where: { id: p.id }, data: { image_url: res.url } }),
    `maj produit ${p.id}`
  );
  totalOctets += res.octets;
  nbCouvertures++;
  if (nbCouvertures % 20 === 0) console.log(`  … ${nbCouvertures}/${produits.length}`);
}

// 2) Galerie (produit_images.data)
const images = await reessais(
  () =>
    prisma.$queryRawUnsafe(
      `SELECT id, produit_id, data FROM produit_images
       WHERE data NOT LIKE 'http%' ORDER BY id`
    ),
  "lecture galerie"
);
console.log(`Photos de galerie à migrer : ${images.length}`);
for (const img of images) {
  if (!APPLIQUER) {
    const t = MOTIF.exec(img.data);
    if (t) totalOctets += Buffer.from(t[2], "base64").length;
    nbGalerie++;
    continue;
  }
  const res = await reessais(
    () => televerser(img.data, `produits/${img.produit_id}`),
    `image ${img.id}`
  );
  if (!res) continue;
  await reessais(
    () => prisma.produitImage.update({ where: { id: img.id }, data: { data: res.url } }),
    `maj image ${img.id}`
  );
  totalOctets += res.octets;
  nbGalerie++;
  if (nbGalerie % 20 === 0) console.log(`  … ${nbGalerie}/${images.length}`);
}

const mo = (totalOctets / 1024 / 1024).toFixed(1);
console.log(
  `\n${nbCouvertures} couverture(s) + ${nbGalerie} photo(s) de galerie — ${mo} Mo` +
    (APPLIQUER ? " déplacés hors de la base ✅" : " seraient déplacés (à blanc).")
);

if (APPLIQUER) {
  const restant = await prisma.$queryRawUnsafe(
    `SELECT
       (SELECT count(*) FROM produits WHERE image_url IS NOT NULL AND image_url NOT LIKE 'http%') AS couvertures,
       (SELECT count(*) FROM produit_images WHERE data NOT LIKE 'http%') AS galerie`
  );
  console.log("Restant en base (doit être 0/0) :", JSON.stringify(restant));
  console.log(
    "\nPensez ensuite à exécuter VACUUM FULL sur la base pour libérer l'espace disque," +
      "\nou laissez Postgres le récupérer progressivement."
  );
}

await prisma.$disconnect();
