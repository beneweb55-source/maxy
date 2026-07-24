import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { creerJeton, DUREE_SESSION_S, SESSION_COOKIE } from "@/lib/session";
import { erreur } from "@/lib/api";

const MAX_TENTATIVES = 5;
const DUREE_BLOCAGE_MS = 5 * 60 * 1000;

const HASH_FICTIF = hashPassword("mot-de-passe-factice");

const MESSAGE_ECHEC = "Identifiants incorrects.";

export async function POST(request: NextRequest) {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { username, password } = (corps ?? {}) as {
    username?: unknown;
    password?: unknown;
  };
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return erreur(400, "Identifiant et mot de passe requis.");
  }

  // Tolérance de saisie mobile : espaces parasites et majuscule automatique du
  // clavier (« Raouf » ≠ « raouf ») ne doivent pas empêcher la connexion.
  const identifiant = username.trim();
  const user = await prisma.user.findFirst({
    where: { username: { equals: identifiant, mode: "insensitive" } },
  });
  if (!user) {
    verifyPassword(password, HASH_FICTIF);
    return erreur(401, MESSAGE_ECHEC);
  }

  if (user.locked_until && user.locked_until > new Date()) {
    const minutes = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000);
    return erreur(
      429,
      `Compte temporairement bloqué après ${MAX_TENTATIVES} tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`
    );
  }

  if (!verifyPassword(password, user.password_hash)) {
    const tentatives = user.login_attempts + 1;
    if (tentatives >= MAX_TENTATIVES) {
      await prisma.user.update({
        where: { id: user.id },
        data: { login_attempts: 0, locked_until: new Date(Date.now() + DUREE_BLOCAGE_MS) },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { login_attempts: tentatives },
      });
    }
    return erreur(401, MESSAGE_ECHEC);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { login_attempts: 0, locked_until: null },
  });

  const reponse = NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role, langue: user.langue },
  });
  reponse.cookies.set(SESSION_COOKIE, creerJeton(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SESSION_S,
  });
  // Cookie de langue (lisible côté client, mis à jour lors d'une bascule) :
  // le compte retrouve sa langue sur n'importe quel appareil dès la connexion.
  reponse.cookies.set("langue", user.langue, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SESSION_S,
  });
  return reponse;
}
