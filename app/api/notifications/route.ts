import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { verifierAlertesQuotidiennes } from "@/lib/alertes";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    await verifierAlertesQuotidiennes();

    const brut = Number(request.nextUrl.searchParams.get("limit"));
    const limit = Number.isInteger(brut) && brut > 0 ? Math.min(brut, 100) : undefined;

    const [notifications, nonLues] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { user_id: user.id, lu: false } }),
    ]);

    return NextResponse.json({
      non_lues: nonLues,
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        lu: n.lu,
        lien: n.lien,
        created_at: n.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/notifications", e);
    return erreur(500, "Erreur lors du chargement des notifications.");
  }
}
