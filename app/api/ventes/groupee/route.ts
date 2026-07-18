import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { formaterDA } from "@/lib/caisse";
import { margeVente, seuilMargeMinimum } from "@/lib/finances";
import { idsParRole, notifier } from "@/lib/notifs";
import { entierPositif } from "@/lib/validation";

/**
 * Vente groupée (bundle) : un prix total unique réparti au prorata du prix de
 * vente fixé de chaque produit. Chaque produit conserve sa propre ligne de
 * vente / marge / mouvement de caisse, toutes taguées avec le même
 * `groupe_vente` — la mécanique unitaire (inventaire, marges, répartition) reste
 * cohérente.
 */
export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { produit_ids, prix_total, canal, date_vente, confirmer } = (corps ?? {}) as {
    produit_ids?: unknown;
    prix_total?: unknown;
    canal?: unknown;
    date_vente?: unknown;
    confirmer?: unknown;
  };

  if (!Array.isArray(produit_ids) || produit_ids.length < 2) {
    return erreur(400, "Sélectionnez au moins deux produits pour une vente groupée.");
  }
  const ids = produit_ids.map((v) => Number(v));
  if (ids.some((v) => !Number.isInteger(v))) {
    return erreur(400, "Liste de produits invalide.");
  }
  const idsUniques = Array.from(new Set(ids));
  if (idsUniques.length !== ids.length) {
    return erreur(400, "Un produit est présent en double dans la sélection.");
  }

  const erreurPrix = entierPositif(prix_total, "Le prix total");
  if (erreurPrix) return erreur(400, erreurPrix);
  const prixTotal = prix_total as number;
  const canalTexte = typeof canal === "string" && canal.trim() ? canal.trim() : null;

  let quand = new Date();
  if (typeof date_vente === "string" && date_vente.trim()) {
    const saisie = new Date(date_vente);
    if (Number.isNaN(saisie.getTime())) return erreur(400, "Date de vente invalide.");
    if (saisie.getTime() > Date.now()) {
      return erreur(400, "La date de vente ne peut pas être dans le futur.");
    }
    quand = saisie;
  }

  try {
    const produits = await prisma.produit.findMany({
      where: { id: { in: idsUniques } },
      include: { reparations: { select: { cout: true } } },
    });
    if (produits.length !== idsUniques.length) {
      return erreur(404, "Un des produits sélectionnés est introuvable.");
    }
    const nonEnVente = produits.filter((p) => p.statut !== "en_vente");
    if (nonEnVente.length > 0) {
      return erreur(
        400,
        `Produit non disponible à la vente : ${nonEnVente.map((p) => p.code_interne).join(", ")}.`
      );
    }

    // Conserve l'ordre de sélection pour une répartition déterministe.
    const ordonnes = idsUniques.map((id) => produits.find((p) => p.id === id)!);
    const coutRep = (p: (typeof produits)[number]) =>
      p.reparations.reduce((s, r) => s + r.cout, 0);

    // Répartition du prix total au prorata du prix de vente fixé (sinon équirépartition).
    const poids = ordonnes.map((p) => p.prix_vente_fixe ?? 0);
    const sommePoids = poids.reduce((s, v) => s + v, 0);
    const parts = ordonnes.map((_, i) =>
      sommePoids > 0
        ? Math.floor((prixTotal * poids[i]!) / sommePoids)
        : Math.floor(prixTotal / ordonnes.length)
    );
    // Affecte le reste d'arrondi aux premiers produits pour que Σ parts = prix_total.
    let reste = prixTotal - parts.reduce((s, v) => s + v, 0);
    for (let i = 0; i < parts.length && reste > 0; i++) {
      parts[i]! += 1;
      reste -= 1;
    }

    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    const margePct = parametres?.marge_minimum_pct ?? 20;
    const seuilTotal = ordonnes.reduce(
      (s, p) => s + seuilMargeMinimum(p.prix_achat, coutRep(p), margePct),
      0
    );
    const margeTotale = ordonnes.reduce(
      (s, p, i) => s + margeVente(parts[i]!, p.prix_achat, coutRep(p)),
      0
    );

    if (prixTotal < seuilTotal && confirmer !== true) {
      return NextResponse.json({
        confirmation_required: true,
        message: `Prix total sous la marge minimum (${margePct} %) : seuil conseillé ${formaterDA(seuilTotal)}, marge à ce prix ${formaterDA(margeTotale)}. Confirmer la vente groupée ?`,
        seuil_minimum: seuilTotal,
        marge_prevue: margeTotale,
      });
    }

    const groupeVente = randomUUID();
    const venteIds = await prisma.$transaction(async (tx) => {
      const cree: number[] = [];
      for (let i = 0; i < ordonnes.length; i++) {
        const produit = ordonnes[i]!;
        const part = parts[i]!;
        const vente = await tx.vente.create({
          data: {
            produit_id: produit.id,
            vendu_par: user.id,
            prix_vente_reel: part,
            canal: canalTexte,
            date_vente: quand,
            groupe_vente: groupeVente,
          },
        });
        await tx.produit.update({
          where: { id: produit.id },
          data: { statut: "vendu", prix_vente_reel: part, date_vente: quand },
        });
        await tx.historiqueStatut.create({
          data: {
            produit_id: produit.id,
            user_id: user.id,
            statut_avant: "en_vente",
            statut_apres: "vendu",
            note: `Vente groupée ${formaterDA(part)}${canalTexte ? ` — ${canalTexte}` : ""}`,
          },
        });
        await ajouterMouvement(tx, {
          montant: part,
          type: "vente",
          user_id: user.id,
          produit_id: produit.id,
          date: quand,
          description: `Vente groupée ${produit.reference}${canalTexte ? ` — ${canalTexte}` : ""}`,
        });
        cree.push(vente.id);
      }
      const gerants = await idsParRole(tx, "gerant");
      await notifier(
        tx,
        gerants,
        `Vente groupée : ${ordonnes.length} produits — ${formaterDA(prixTotal)} (${user.username})`,
        `/ventes`
      );
      return cree;
    });

    return NextResponse.json(
      { ok: true, groupe_vente: groupeVente, vente_ids: venteIds },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/ventes/groupee", e);
    return erreur(500, "Erreur lors de l'enregistrement de la vente groupée.");
  }
}
