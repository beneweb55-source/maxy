import { prisma } from "./db";

const JOUR_MS = 24 * 60 * 60 * 1000;
const LIEN_PLUS_30J = "/inventaire?plus30j=1";

export async function verifierAlertesQuotidiennes(): Promise<void> {
  const maintenant = new Date();
  const debutJour = new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  );

  const dejaFaite = await prisma.notification.findFirst({
    where: { lien: LIEN_PLUS_30J, created_at: { gte: debutJour } },
    select: { id: true },
  });
  if (dejaFaite) return;

  const seuil30 = new Date(maintenant.getTime() - 30 * JOUR_MS);
  const nb = await prisma.produit.count({
    where: { statut: { not: "vendu" }, lot: { date_entree: { lt: seuil30 } } },
  });
  if (nb === 0) return;

  const gerants = await prisma.user.findMany({
    where: { role: "gerant" },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: gerants.map((g) => ({
      user_id: g.id,
      message: `${nb} produit${nb > 1 ? "s" : ""} en stock depuis plus de 30 jours`,
      lien: LIEN_PLUS_30J,
    })),
  });
}
