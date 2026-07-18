import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Langue, Role } from "@prisma/client";
import { prisma } from "./db";
import { SESSION_COOKIE } from "./constantes";

export { SESSION_COOKIE };
export const DUREE_SESSION_S = 7 * 24 * 60 * 60;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET manquant dans .env");
  return s;
}

function signer(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function creerJeton(userId: number): string {
  const expiration = Date.now() + DUREE_SESSION_S * 1000;
  const payload = `${userId}.${expiration}`;
  return `${payload}.${signer(payload)}`;
}

export function verifierJeton(jeton: string): number | null {
  const morceaux = jeton.split(".");
  if (morceaux.length !== 3) return null;
  const [idStr, expStr, signature] = morceaux;
  if (!idStr || !expStr || !signature) return null;

  const attendu = signer(`${idStr}.${expStr}`);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(attendu, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiration = Number(expStr);
  const userId = Number(idStr);
  if (!Number.isInteger(userId) || !Number.isFinite(expiration)) return null;
  if (Date.now() > expiration) return null;
  return userId;
}

export interface Utilisateur {
  id: number;
  username: string;
  role: Role;
  langue: Langue;
}

export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const magasin = await cookies();
  const jeton = magasin.get(SESSION_COOKIE)?.value;
  if (!jeton) return null;
  const userId = verifierJeton(jeton);
  if (userId === null) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, langue: true },
  });
}
