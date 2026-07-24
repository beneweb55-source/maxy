import { prisma } from "./db";

const JOUR_MS = 24 * 60 * 60 * 1000;
const LIEN_PLUS_30J = "/inventaire?plus30j=1";
const LIEN_HS = "/inventaire?statuts=hs";

async function dejaNotifieAujourdhui(lien: string, debutJour: Date): Promise<boolean> {
  const trouvee = await prisma.notification.findFirst({
    where: { lien, created_at: { gte: debutJour } },
    select: { id: true },
  });
  return trouvee !== null;
}

async function notifierGerants(message: string, lien: string): Promise<void> {
  const gerants = await prisma.user.findMany({
    where: { role: "gerant" },
    select: { id: true },
  });
  if (gerants.length === 0) return;
  await prisma.notification.createMany({
    data: gerants.map((g) => ({ user_id: g.id, message, lien })),
  });
}

export async function verifierAlertesQuotidiennes(): Promise<void> {
  const maintenant = new Date();
  const debutJour = new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  );

  // Stock immobilisé depuis plus de 30 jours.
  if (!(await dejaNotifieAujourdhui(LIEN_PLUS_30J, debutJour))) {
    const seuil30 = new Date(maintenant.getTime() - 30 * JOUR_MS);
    const nb = await prisma.produit.count({
      where: {
        statut: { not: "vendu" },
        OR: [
          { lot: { date_entree: { lt: seuil30 } } },
          { lot_id: null, created_at: { lt: seuil30 } },
        ],
      },
    });
    if (nb > 0) {
      await notifierGerants(
        `${nb} produit${nb > 1 ? "s" : ""} en stock depuis plus de 30 jours`,
        LIEN_PLUS_30J
      );
    }
  }

  // Produits HS en stock (dont ceux marqués « à jeter »).
  if (!(await dejaNotifieAujourdhui(LIEN_HS, debutJour))) {
    const [nbHs, nbAJeter] = await Promise.all([
      prisma.produit.count({ where: { statut: "hs" } }),
      prisma.produit.count({ where: { statut: "hs", a_jeter: true } }),
    ]);
    if (nbHs > 0) {
      const suffixe = nbAJeter > 0 ? ` (dont ${nbAJeter} à jeter)` : "";
      await notifierGerants(
        `${nbHs} produit${nbHs > 1 ? "s" : ""} HS en stock${suffixe}`,
        LIEN_HS
      );
    }
  }
}
