import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";

export async function POST() {
  const user = await utilisateurCourant();
  if (!user || (user.role !== "gerant" && user.role !== "dev")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    await prisma.parametres.update({
      where: { id: 1 },
      data: { caisse_vide_a: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation de la caisse :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
