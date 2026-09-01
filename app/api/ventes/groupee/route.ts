import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { formaterDA } from "@/lib/caisse";
import { margeVente, seuilMargeMinimum } from "@/lib/finances";
import { idsParRole, notifier } from "@/lib/notifs";
import { entierPositif, entierPositifOuNul } from "@/lib/validation";
import { creerFacture, type LigneFacture } from "@/lib/factures";

/**
 * Vente groupée (bundle / multi-sélection) : prix total ou prix par produit.
 * Chaque produit conserve sa propre ligne de vente / marge / mouvement de caisse,
 * toutes taguées avec le même `groupe_vente`.
 */
export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { produit_ids, prix_total, prix_par_produit, canal, date_vente, confirmer, client_nom, client_tel, client_adresse, client_rc, client_nif, client_ai, client_nis, type_facture, mode_paiement, etiquette_imprimee } =
    (corps ?? {}) as {
      produit_ids?: unknown;
      prix_total?: unknown;
      prix_par_produit?: unknown;
      canal?: unknown;
      date_vente?: unknown;
      confirmer?: unknown;
      client_nom?: unknown;
      client_tel?: unknown;
      client_adresse?: unknown;
      client_rc?: unknown;
      client_nif?: unknown;
      client_ai?: unknown;
      client_nis?: unknown;
      type_facture?: unknown;
      mode_paiement?: unknown;
      etiquette_imprimee?: unknown;
    };

  const estEtiquetteImprimee = Boolean(etiquette_imprimee);

  if (!Array.isArray(produit_ids) || produit_ids.length < 1) {
    return erreur(400, "Sélectionnez au moins un produit pour une vente groupée.");
  }
  const ids = produit_ids.map((v) => Number(v));
  if (ids.some((v) => !Number.isInteger(v))) {
    return erreur(400, "Liste de produits invalide.");
  }
  const idsUniques = Array.from(new Set(ids));
  if (idsUniques.length !== ids.length) {
    return erreur(400, "Un produit est présent en double dans la sélection.");
  }

  const erreurPrix = entierPositifOuNul(prix_total, "Le prix total");
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
    const nonDispo = produits.filter((p) => p.statut === "vendu" || p.statut === "hs");
    if (nonDispo.length > 0) {
      return erreur(
        400,
        `Produit indisponible à la vente (déjà vendu ou HS) : ${nonDispo.map((p) => p.code_interne).join(", ")}.`
      );
    }

    // Conserve l'ordre de sélection pour une répartition déterministe.
    const ordonnes = idsUniques.map((id) => produits.find((p) => p.id === id)!);
    const coutRep = (p: (typeof produits)[number]) =>
      p.reparations.reduce((s, r) => s + r.cout, 0);

    // Si une map de prix unitaires personnalisés est fournie, l'utiliser en priorité
    const mapPrix = typeof prix_par_produit === "object" && prix_par_produit !== null
      ? (prix_par_produit as Record<number, number>)
      : null;

    let parts: number[];
    if (mapPrix) {
      parts = ordonnes.map((p) => {
        const val = mapPrix[p.id];
        return typeof val === "number" && val >= 0 ? val : (p.prix_vente_fixe ?? 0);
      });
    } else {
      // Répartition du prix total au prorata du prix de vente fixé (sinon équirépartition).
      const poids = ordonnes.map((p) => p.prix_vente_fixe ?? 0);
      const sommePoids = poids.reduce((s, v) => s + v, 0);
      parts = ordonnes.map((_, i) =>
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
      // Double vérification atomique sous transaction (Protection contre Race Conditions)
      const pVerifs = await tx.produit.findMany({
        where: { id: { in: idsUniques } },
        select: { id: true, statut: true, code_interne: true, numero_serie: true },
      });
      const nonDispos = pVerifs.filter((p) => p.statut === "vendu" || p.statut === "hs");
      if (pVerifs.length !== idsUniques.length || nonDispos.length > 0) {
        const codes = nonDispos.map((p) => p.code_interne).join(", ");
        throw new Error(`Conflit de vente concurrente : certains exemplaires ne sont plus disponibles (${codes || "introuvables"}).`);
      }

      const statutParId = new Map(pVerifs.map((p) => [p.id, p.statut]));

      const cree: number[] = [];
      const lignesFacture: LigneFacture[] = [];
      for (let i = 0; i < ordonnes.length; i++) {
        const produit = ordonnes[i]!;
        const part = parts[i]!;
        const statutOrigine = statutParId.get(produit.id) || "en_vente";

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
        const updateProduitData: any = {
          statut: "vendu",
          prix_vente_reel: part,
          date_vente: quand,
          en_vitrine: false,
        };
        if (estEtiquetteImprimee) {
          updateProduitData.etiquette_imprimee = true;
          updateProduitData.etiquette_imprimee_le = quand;
        }
        await tx.produit.update({
          where: { id: produit.id },
          data: updateProduitData,
        });

        // Vitrine par modèle : transférer le drapeau à un exemplaire identique restant
        if (produit.en_vitrine) {
          const modele = {
            reference: { equals: produit.reference.trim(), mode: "insensitive" as const },
            categorie: { equals: produit.categorie.trim(), mode: "insensitive" as const },
          };
          const encoreExpose = await tx.produit.count({
            where: { ...modele, id: { notIn: idsUniques }, en_vitrine: true, statut: { not: "vendu" } },
          });
          if (encoreExpose === 0) {
            const remplacant = await tx.produit.findFirst({
              where: { ...modele, id: { notIn: idsUniques }, statut: { not: "vendu" } },
              orderBy: { id: "asc" },
              select: { id: true },
            });
            if (remplacant) {
              await tx.produit.update({
                where: { id: remplacant.id },
                data: { en_vitrine: true },
              });
            }
          }
        }
        if (statutOrigine !== "en_vente") {
          await tx.historiqueStatut.create({
            data: {
              produit_id: produit.id,
              user_id: user.id,
              statut_avant: statutOrigine,
              statut_apres: "en_vente",
              note: "Mise en vente automatique au comptoir (Auto-Override)",
            },
          });
        }
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

        const designationLigne = produit.numero_serie 
          ? `${produit.reference} (S/N: ${produit.numero_serie})` 
          : produit.reference;

        lignesFacture.push({
          produit_id: produit.id,
          vente_id: vente.id,
          code_interne: produit.code_interne,
          designation: designationLigne,
          categorie: produit.categorie,
          prix: part,
        });
      }
      const gerants = await idsParRole(tx, "gerant");
      await notifier(
        tx,
        gerants,
        `Vente groupée : ${ordonnes.length} produits — ${formaterDA(prixTotal)} (${user.username})`,
        `/ventes`
      );
      // Une seule facture pour toute la vente groupée (garantie incluse).
      const facture = await creerFacture(tx, {
        lignes: lignesFacture,
        userId: user.id,
        quand,
        canal: canalTexte,
        clientNom: typeof client_nom === "string" ? client_nom : null,
        clientTel: typeof client_tel === "string" ? client_tel : null,
        clientAdresse: typeof client_adresse === "string" ? client_adresse : null,
        clientRc: typeof client_rc === "string" ? client_rc : null,
        clientNif: typeof client_nif === "string" ? client_nif : null,
        clientAi: typeof client_ai === "string" ? client_ai : null,
        clientNis: typeof client_nis === "string" ? client_nis : null,
        typeFacture: typeof type_facture === "string" ? type_facture : null,
        modePaiement: typeof mode_paiement === "string" ? mode_paiement : null,
        groupeVente,
      });
      return { cree, facture };
    });

    return NextResponse.json(
      {
        ok: true,
        groupe_vente: groupeVente,
        vente_ids: venteIds.cree,
        facture_id: venteIds.facture.id,
        facture_numero: venteIds.facture.numero,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("POST /api/ventes/groupee", e);
    return erreur(500, e?.message || "Erreur lors de l'enregistrement de la vente groupée.");
  }
}
