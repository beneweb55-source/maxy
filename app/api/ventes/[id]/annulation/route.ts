import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { notifier } from "@/lib/notifs";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const venteId = Number(id);
  if (!Number.isInteger(venteId)) return erreur(400, "Identifiant de vente invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { motif } = (corps ?? {}) as { motif?: unknown };
  if (typeof motif !== "string" || !motif.trim()) {
    return erreur(400, "Le motif d'annulation est obligatoire.");
  }

  try {
    const vente = await prisma.vente.findUnique({
      where: { id: venteId },
      include: { produit: { select: { id: true, reference: true, statut: true } } },
    });
    if (!vente) return erreur(404, "Vente introuvable.");
    if (vente.annulee) return erreur(409, "Cette vente est déjà annulée.");
    if (vente.produit.statut !== "vendu") {
      return erreur(400, "Le produit de cette vente n'est plus en statut « Vendu ».");
    }

    await prisma.$transaction(async (tx) => {
      await tx.vente.update({
        where: { id: vente.id },
        data: {
          annulee: true,
          motif_annulation: motif.trim(),
          annulee_par: user.id,
          annulee_at: new Date(),
        },
      });
      await tx.produit.update({
        where: { id: vente.produit.id },
        data: { statut: "en_vente", prix_vente_reel: null, date_vente: null },
      });
      await tx.historiqueStatut.create({
        data: {
          produit_id: vente.produit.id,
          user_id: user.id,
          statut_avant: "vendu",
          statut_apres: "en_vente",
          note: `Vente annulée : ${motif.trim()}`,
        },
      });
      // Déterminer la caisse de destination depuis la facture liée
      const ligneFacture = await tx.factureLigne.findFirst({
        where: { vente_id: vente.id },
        select: { facture: { select: { caisse_destination: true } } },
      });
      const caisseCible = ligneFacture?.facture?.caisse_destination ?? "CAISSE_PHYSIQUE";

      await ajouterMouvement(tx, {
        montant: vente.prix_vente_reel,
        type: "annulation_vente",
        user_id: user.id,
        produit_id: vente.produit.id,
        caisse: caisseCible,
        description: `Annulation vente ${vente.produit.reference} — ${motif.trim()}`,
      });
      const tous = await tx.user.findMany({ select: { id: true } });
      await notifier(
        tx,
        tous.map((u) => u.id),
        `Vente annulée par ${user.username} : ${vente.produit.reference} — ${motif.trim()}`,
        `/produits/${vente.produit.id}`
      );

      // Répercussion sur la facture : une facture dont TOUTES les ventes sont
      // annulées devient elle-même annulée. Sur une facture multi-produits,
      // elle reste émise (le reste a bien été vendu) ; la ligne concernée est
      // signalée comme annulée à l'affichage et à l'impression.
      const lignes = await tx.factureLigne.findMany({
        where: { vente_id: vente.id },
        select: { facture_id: true },
      });
      for (const factureId of new Set(lignes.map((l) => l.facture_id))) {
        const idsVentes = (
          await tx.factureLigne.findMany({
            where: { facture_id: factureId, vente_id: { not: null } },
            select: { vente_id: true },
          })
        )
          .map((l) => l.vente_id)
          .filter((v): v is number => v !== null);
        const restantes = await tx.vente.count({
          where: { id: { in: idsVentes }, annulee: false },
        });
        if (restantes === 0) {
          await tx.facture.update({ where: { id: factureId }, data: { annulee: true } });
        }
      }

      await enregistrerActivite(tx, user.id, ACTIONS_JOURNAL.VENTE_ANNULER, "produit", vente.produit.id, {
        motif: motif.trim(),
        vente_id: vente.id
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/ventes/[id]/annulation", e);
    return erreur(500, "Erreur lors de l'annulation de la vente.");
  }
}
