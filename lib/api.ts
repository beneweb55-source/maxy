import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { utilisateurCourant, type Utilisateur } from "./session";

export function erreur(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

type Acces =
  | { user: Utilisateur; reponse?: undefined }
  | { user?: undefined; reponse: NextResponse };

export async function exigerUtilisateur(roles?: readonly Role[]): Promise<Acces> {
  const user = await utilisateurCourant();
  if (!user) return { reponse: erreur(401, "Vous devez être connecté.") };
  if (roles && !roles.includes(user.role)) {
    return { reponse: erreur(403, "Vous n'avez pas les droits pour cette action.") };
  }
  return { user };
}
