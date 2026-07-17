import { NextResponse } from "next/server";
import { exigerUtilisateur } from "@/lib/api";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  return NextResponse.json({ user: acces.user });
}
