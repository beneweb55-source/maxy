import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { idsParRole, notifier } from "@/lib/notifs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["technicien"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const { message } = (corps ?? {}) as { message?: string };

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");

    await prisma.$transaction(async (tx) => {
      const gerants = await idsParRole(tx, "gerant");
      await notifier(
        tx,
        gerants,
        `Alerte de manque sur le lot n°${lot.id} (${lot.fournisseur}) : ${message || 'Ecart signalé par le technicien.'}`,
        `/lots/${lot.id}`
      );
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lots/[id]/signaler-manque", e);
    return erreur(500, "Erreur lors du signalement.");
  }
}
