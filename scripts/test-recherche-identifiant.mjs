// Vérifie que la recherche d'identifiant utilisée par /api/auth/login
// (findFirst + equals insensitive sur l'identifiant trimé) retrouve bien les
// comptes malgré la majuscule automatique / les espaces des claviers mobiles.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Saisies typiques d'un clavier mobile (majuscule auto, espace parasite).
const SAISIES = ["Raouf", "raouf", "IMED", " imed ", "Imed"];

for (let tentative = 1; tentative <= 8; tentative++) {
  try {
    for (const brut of SAISIES) {
      const identifiant = brut.trim();
      const user = await prisma.user.findFirst({
        where: { username: { equals: identifiant, mode: "insensitive" } },
        select: { id: true, username: true },
      });
      console.log(
        `Saisie "${brut}" → ${user ? `trouve #${user.id} "${user.username}" ✅` : "AUCUN COMPTE ❌"}`
      );
    }
    break;
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.error(`Tentative ${tentative} échouée : ${message}`);
    if (tentative === 8) process.exit(1);
    await attendre(5000);
  }
}

await prisma.$disconnect();
