// Diagnostic de connexion : vérifie l'existence des comptes, leur état de
// verrouillage et la correspondance des mots de passe fournis avec les hashs
// stockés (même algorithme scrypt que lib/auth.ts). N'affiche NI hash NI
// mot de passe — uniquement des booléens.
import { readFileSync } from "node:fs";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
if (!url) {
  console.error("DATABASE_URL introuvable");
  process.exit(1);
}
const prisma = new PrismaClient({ datasourceUrl: url });

function verifier(password, stored) {
  const [salt, hash] = (stored ?? "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// Mots de passe à tester, passés en argument : node script.mjs user:mdp user:mdp
const aTester = process.argv.slice(2).map((paire) => {
  const i = paire.indexOf(":");
  return { username: paire.slice(0, i), password: paire.slice(i + 1) };
});

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Neon est parfois injoignable depuis cet environnement : on réessaie.
let users;
for (let tentative = 1; tentative <= 8; tentative++) {
  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        login_attempts: true,
        locked_until: true,
        password_hash: true,
      },
      orderBy: { id: "asc" },
    });
    break;
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.error(`Tentative ${tentative} échouée : ${message}`);
    if (tentative === 8) process.exit(1);
    await attendre(5000);
  }
}

console.log("=== Comptes existants ===");
for (const u of users) {
  const verrou =
    u.locked_until && u.locked_until > new Date()
      ? `VERROUILLÉ jusqu'à ${u.locked_until.toISOString()}`
      : "non verrouillé";
  const formatHash = /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(u.password_hash)
    ? "format hash OK"
    : "FORMAT HASH INATTENDU";
  console.log(
    `#${u.id} "${u.username}" (${u.role}) — tentatives=${u.login_attempts} — ${verrou} — ${formatHash}`
  );
}

console.log("\n=== Test des mots de passe fournis ===");
for (const { username, password } of aTester) {
  const exact = users.find((u) => u.username === username);
  const insensible = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (!exact && !insensible) {
    console.log(`"${username}" : AUCUN compte (même en ignorant la casse)`);
    continue;
  }
  const u = exact ?? insensible;
  if (!exact) {
    console.log(
      `"${username}" : compte introuvable en casse exacte, mais "${u.username}" existe (la connexion est sensible à la casse !)`
    );
  }
  const ok = verifier(password, u.password_hash);
  console.log(
    `"${u.username}" : mot de passe fourni ${ok ? "CORRESPOND ✅" : "NE CORRESPOND PAS ❌"}`
  );
}

await prisma.$disconnect();
