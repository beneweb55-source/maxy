import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { notifier } from "@/lib/notifs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const factureId = Number(id);
  if (!Number.isInteger(factureId)) return erreur(400, "Identifiant de facture invalide.");

  try {
    const f = await prisma.facture.findUnique({
      where: { id: factureId },
      select: {
        id: true,
        numero: true,
        date_emission: true,
        client_nom: true,
        client_tel: true,
        total: true,
        garantie_mois: true,
        garantie_fin: true,
        canal: true,
        canal_vente: true,
        caisse_destination: true,
        type_vente: true,
        type_document: true,
        client_adresse: true,
        client_rc: true,
        client_nif: true,
        client_ai: true,
        client_nis: true,
        mode_paiement: true,
        annulee: true,
        createur: { select: { username: true } },
        lignes: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            produit_id: true,
            vente_id: true,
            code_interne: true,
            designation: true,
            categorie: true,
            prix: true,
            garantie_fin: true,
          },
        },
      },
    });
    if (!f) return erreur(404, "Facture introuvable.");

    // Une ligne dont la vente a été annulée est signalée : sur une facture
    // multi-produits, seul l'article retourné est barré (et retiré du net).
    const idsVentes = f.lignes
      .map((l) => l.vente_id)
      .filter((v): v is number => v !== null);
    const ventesAnnulees = new Set(
      (
        await prisma.vente.findMany({
          where: { id: { in: idsVentes }, annulee: true },
          select: { id: true },
        })
      ).map((v) => v.id)
    );
    const totalNet = f.lignes.reduce(
      (s, l) => (l.vente_id !== null && ventesAnnulees.has(l.vente_id) ? s : s + l.prix),
      0
    );

    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });

    return NextResponse.json({
      id: f.id,
      numero: f.numero,
      date_emission: f.date_emission.toISOString(),
      client_nom: f.client_nom,
      client_tel: f.client_tel,
      total: f.total,
      total_net: totalNet,
      garantie_mois: f.garantie_mois,
      garantie_fin: f.garantie_fin.toISOString(),
      canal: f.canal,
      canal_vente: f.canal_vente,
      caisse_destination: f.caisse_destination,
      type_vente: f.type_vente,
      saleType: f.type_vente,
      type_document: f.type_document,
      type_facture: f.type_document, // Alias legacy pour compatibilité PDF
      client_adresse: f.client_adresse,
      client_rc: f.client_rc,
      client_nif: f.client_nif,
      client_ai: f.client_ai,
      client_nis: f.client_nis,
      mode_paiement: f.mode_paiement,
      annulee: f.annulee,
      vendeur: f.createur.username,
      lignes: f.lignes.map((l) => ({
        id: l.id,
        produit_id: l.produit_id,
        code_interne: l.code_interne,
        designation: l.designation,
        categorie: l.categorie,
        prix: l.prix,
        garantie_fin: l.garantie_fin.toISOString(),
        annulee: l.vente_id !== null && ventesAnnulees.has(l.vente_id),
      })),
      entreprise: {
        nom: parametres?.entreprise_nom ?? "Solution Maxi",
        adresse: parametres?.entreprise_adresse ?? "Alger, Algérie",
        tel: parametres?.entreprise_tel ?? "0000 00 00 00",
        rc: parametres?.entreprise_rc ?? "RC XXXXXXXXX",
        nif: parametres?.entreprise_nif ?? "NIF XXXXXXXXX",
        nis: parametres?.entreprise_nis ?? "NIS XXXXXXXXX",
        art: parametres?.entreprise_art ?? "ART XXXXXXXXX",
        rib: parametres?.entreprise_rib ?? null,
        cachet: parametres?.entreprise_cachet ?? null,
      },
    });
  } catch (e) {
    console.error("GET /api/factures/[id]", e);
    return erreur(500, "Erreur lors du chargement de la facture.");
  }
}

// Renseigner/corriger les informations client ou le type de vente après coup.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const factureId = Number(id);
  if (!Number.isInteger(factureId)) return erreur(400, "Identifiant de facture invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { client_nom, client_tel } = (corps ?? {}) as {
    client_nom?: unknown;
    client_tel?: unknown;
  };

  const donnees: {
    client_nom?: string | null;
    client_tel?: string | null;
    client_adresse?: string | null;
    client_rc?: string | null;
    client_nif?: string | null;
    client_ai?: string | null;
    client_nis?: string | null;
    type_document?: "FACTURE_TVA" | "PROFORMA" | "DEVIS";
    type_vente?: "COMPTOIR" | "YALIDINE";
    caisse_destination?: "CAISSE_PHYSIQUE" | "CAISSE_YALIDINE";
    canal_vente?: "COMPTOIR" | "YALIDINE";
  } = {};
  if (client_nom !== undefined) {
    if (client_nom !== null && typeof client_nom !== "string") {
      return erreur(400, "Nom du client invalide.");
    }
    donnees.client_nom = typeof client_nom === "string" && client_nom.trim() ? client_nom.trim() : null;
  }
  if (client_tel !== undefined) {
    if (client_tel !== null && typeof client_tel !== "string") {
      return erreur(400, "Téléphone du client invalide.");
    }
    donnees.client_tel = typeof client_tel === "string" && client_tel.trim() ? client_tel.trim() : null;
  }
  
  const additionalFields = [
    "client_adresse",
    "client_rc",
    "client_nif",
    "client_ai",
    "client_nis",
  ] as const;

  // Gestion séparée du type de document (nouveau: type_document, legacy: type_facture)
  const typeDocumentBody = (corps as any)?.["type_document"] ?? (corps as any)?.["type_facture"];
  if (typeDocumentBody !== undefined) {
    const typesValides = ["FACTURE_TVA", "PROFORMA", "DEVIS"];
    const valStr = typeof typeDocumentBody === "string" ? typeDocumentBody.trim().toUpperCase() : null;
    if (!valStr || !typesValides.includes(valStr)) {
      return erreur(400, `Type de document invalide. Valeurs acceptées : ${typesValides.join(", ")}`);
    }
    donnees.type_document = valStr as "FACTURE_TVA" | "PROFORMA" | "DEVIS";
  }

  // Gestion du type de vente (COMPTOIR ou YALIDINE) avec rééquilibrage de caisse
  const typeVenteBody = (corps as any)?.["type_vente"] ?? (corps as any)?.["saleType"];
  let nouveauTypeVente: "COMPTOIR" | "YALIDINE" | undefined;
  if (typeVenteBody !== undefined) {
    const valStr = typeof typeVenteBody === "string" ? typeVenteBody.trim().toUpperCase() : null;
    if (valStr !== "COMPTOIR" && valStr !== "YALIDINE") {
      return erreur(400, "Type de vente invalide. Choisissez 'COMPTOIR' ou 'YALIDINE'.");
    }
    nouveauTypeVente = valStr as "COMPTOIR" | "YALIDINE";
    donnees.type_vente = nouveauTypeVente;
    donnees.caisse_destination = nouveauTypeVente === "YALIDINE" ? "CAISSE_YALIDINE" : "CAISSE_PHYSIQUE";
    donnees.canal_vente = nouveauTypeVente === "YALIDINE" ? "YALIDINE" : "COMPTOIR";
  }

  for (const field of additionalFields) {
    const val = (corps ?? {})[field as keyof typeof corps];
    if (val !== undefined) {
      if (val !== null && typeof val !== "string") {
        return erreur(400, `Le champ ${field} est invalide.`);
      }
      const valStr = val as string;
      (donnees as any)[field] = typeof val === "string" && valStr.trim() ? valStr.trim() : null;
    }
  }

  if (Object.keys(donnees).length === 0) return erreur(400, "Aucune modification fournie.");

  try {
    const maj = await prisma.$transaction(async (tx) => {
      const ancienneFacture = await tx.facture.findUnique({
        where: { id: factureId },
        include: { lignes: { select: { vente_id: true, produit_id: true } } },
      });
      if (!ancienneFacture) throw new Error("Facture introuvable.");

      const fMaj = await tx.facture.update({
        where: { id: factureId },
        data: donnees,
        select: {
          id: true,
          client_nom: true,
          client_tel: true,
          type_document: true,
          type_vente: true,
          caisse_destination: true,
        },
      });

      // Si le type de vente a changé (ex: COMPTOIR <-> YALIDINE)
      if (nouveauTypeVente && nouveauTypeVente !== ancienneFacture.type_vente) {
        const venteIds = ancienneFacture.lignes
          .map((l) => l.vente_id)
          .filter((v): v is number => v !== null);

        if (venteIds.length > 0) {
          // 1. Mettre à jour les ventes associées
          await tx.vente.updateMany({
            where: { id: { in: venteIds } },
            data: { type_vente: nouveauTypeVente },
          });

          // 2. Mettre à jour les mouvements de caisse liés à ces produits
          const produitIds = ancienneFacture.lignes
            .map((l) => l.produit_id)
            .filter((p): p is number => p !== null);

          if (produitIds.length > 0) {
            await tx.mouvementCaisse.updateMany({
              where: {
                produit_id: { in: produitIds },
                type: "vente",
              },
              data: {
                caisse: nouveauTypeVente === "YALIDINE" ? "CAISSE_YALIDINE" : "CAISSE_PHYSIQUE",
              },
            });
          }
        }
      }

      return fMaj;
    });

    return NextResponse.json({ ok: true, ...maj, saleType: maj.type_vente });
  } catch (e) {
    console.error("PATCH /api/factures/[id]", e);
    return erreur(500, "Erreur lors de la modification de la facture.");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const factureId = Number(id);
  if (!Number.isInteger(factureId)) return erreur(400, "Identifiant de facture invalide.");

  try {
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        lignes: { select: { vente_id: true } }
      }
    });
    if (!facture) return erreur(404, "Facture introuvable.");

    const idsVentes = facture.lignes
      .map((l) => l.vente_id)
      .filter((v): v is number => v !== null);

    await prisma.$transaction(async (tx) => {
      // 1. Pour chaque vente associée non encore annulée, on l'annule proprement (statut produit, caisse, etc)
      if (idsVentes.length > 0) {
        const ventes = await tx.vente.findMany({
          where: { id: { in: idsVentes }, annulee: false },
          include: { produit: { select: { id: true, reference: true, statut: true } } }
        });

        for (const vente of ventes) {
          await tx.vente.update({
            where: { id: vente.id },
            data: {
              annulee: true,
              motif_annulation: "Suppression de la facture",
              annulee_par: user.id,
              annulee_at: new Date(),
            },
          });
          
          if (vente.produit.statut === "vendu") {
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
                note: `Vente annulée suite à la suppression de facture`,
              },
            });
          }

          await ajouterMouvement(tx, {
            montant: vente.prix_vente_reel,
            type: "annulation_vente",
            user_id: user.id,
            produit_id: vente.produit.id,
            description: `Annulation vente ${vente.produit.reference} — Suppression facture`,
          });
        }

        const tous = await tx.user.findMany({ select: { id: true } });
        if (ventes.length > 0) {
          await notifier(
            tx,
            tous.map((u) => u.id),
            `Facture ${facture.numero} supprimée et ${ventes.length} vente(s) annulée(s) par ${user.username}`,
            "/factures"
          );
        }
      }

      // 2. Supprimer la facture (les lignes sont supprimées par CASCADE)
      await tx.facture.delete({
        where: { id: facture.id }
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/factures/[id]", e);
    return erreur(500, "Erreur lors de la suppression de la facture.");
  }
}
