import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";

export async function POST(request: Request) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const body = await request.json();
    const { items } = body as { items?: { id: number; ordre: number }[] };

    if (!Array.isArray(items) || items.length === 0) {
      return erreur(400, "Liste d'éléments invalide.");
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.categorie.update({
          where: { id: Number(item.id) },
          data: { ordre: Number(item.ordre) || 0 },
        })
      )
    );

    return NextResponse.json({ ok: true, count: items.length });
  } catch (err) {
    console.error("POST /api/categories/reorder", err);
    return erreur(500, "Erreur lors du réordonnancement.");
  }
}
