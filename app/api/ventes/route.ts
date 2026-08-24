import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { formaterDA } from "@/lib/caisse";
import { margeVente, seuilMargeMinimum } from "@/lib/finances";
import { urlPhotoProduit } from "@/lib/images";
import { idsParRole, notifier } from "@/lib/notifs";
import { creerFacture } from "@/lib/factures";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import { entierPositif } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const clauses: import("@prisma/client").Prisma.VenteWhereInput[] = [];

    const mois = params.get("mois");
    if (mois && /^\d{4}-\d{2}$/.test(mois)) {
      const [a, m] = mois.split("-").map(Number);
      if (a && m) {
        clauses.push({
          date_vente: {
            gte: new Date(Date.UTC(a, m - 1, 1)),
            lt: new Date(Date.UTC(a, m, 1)),
          },
        });
      }
    }
    const vendeur = Number(params.get("vendeur"));
    if (Number.isInteger(vendeur) && vendeur > 0) clauses.push({ vendu_par: vendeur });

    const [ventes, vendeurs] = await Promise.all([
      prisma.vente.findMany({
        where: clauses.length > 0 ? { AND: clauses } : {},
        orderBy: { date_vente: "desc" },
        include: {
          produit: {
            select: {
              id: true,
              code_interne: true,
              reference: true,
              prix_achat: true,
              image_url: true,
              reparations: { select: { cout: true } },
            },
          },
          vendeur: { select: { id: true, username: true } },
        },
      }),
      prisma.user.findMany({ select: { id: true, username: true }, orderBy: { id: "asc" } }),
    ]);

    const lignes = ventes.map((v) => {
      const coutRep = v.produit.reparations.reduce((s, r) => s + r.cout, 0);
      return {
        id: v.id,
        produit_id: v.produit.id,
        code_interne: v.produit.code_interne,
        reference: v.produit.reference,
        image_url: v.produit.image_url ? urlPhotoProduit(v.produit.id) : null,
        prix_vente_reel: v.prix_vente_reel,
        marge: margeVente(v.prix_vente_reel, v.produit.prix_achat, coutRep),
        canal: v.canal,
        date_vente: v.date_vente.toISOString(),
        vendeur: v.vendeur.username,
        vendeur_id: v.vendeur.id,
        annulee: v.annulee,
        motif_annulation: v.motif_annulation,
        groupe_vente: v.groupe_vente,
      };
    });
    const valides = lignes.filter((l) => !l.annulee);

    return NextResponse.json({
      ventes: lignes,
      vendeurs,
      totaux: {
        nombre: valides.length,
        chiffre_affaires: valides.reduce((s, l) => s + l.prix_vente_reel, 0),
        marge: valides.reduce((s, l) => s + l.marge, 0),
      },
    });
  } catch (e) {
    console.error("GET /api/ventes", e);
    return erreur(500, "Erreur lors du chargement des ventes.");
  }
}

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
  const { produit_id, prix_vente_reel, canal, date_vente, confirmer, client_nom, client_tel, client_adresse, client_rc, client_nif, client_ai, client_nis, type_facture, mode_paiement } =
    (corps ?? {}) as {
      produit_id?: unknown;
      prix_vente_reel?: unknown;
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
    };
  const produitId = Number(produit_id);
  if (!Number.isInteger(produitId)) return erreur(400, "Produit invalide.");
  const erreurPrix = entierPositif(prix_vente_reel, "Le prix de vente réel");
  if (erreurPrix) return erreur(400, erreurPrix);
  const prix = prix_vente_reel as number;
  const canalTexte = typeof canal === "string" && canal.trim() ? canal.trim() : null;

  let quand = new Date();
  if (typeof date_vente === "string" && date_vente.trim()) {
    const saisie = new Date(date_vente);
    if (Number.isNaN(saisie.getTime())) {
      return erreur(400, "Date de vente invalide.");
    }
    if (saisie.getTime() > Date.now()) {
      return erreur(400, "La date de vente ne peut pas être dans le futur.");
    }
    quand = saisie;
  }

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      include: { reparations: { select: { cout: true } } },
    });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (produit.statut !== "en_vente") {
      return erreur(400, "Seul un produit « En vente » peut être vendu.");
    }

    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    const margePct = parametres?.marge_minimum_pct ?? 20;
    const coutRep = produit.reparations.reduce((s, r) => s + r.cout, 0);
    const seuil = seuilMargeMinimum(produit.prix_achat, coutRep, margePct);

    if (prix < seuil && confirmer !== true) {
      return NextResponse.json({
        confirmation_required: true,
        message: `Prix sous la marge minimum (${margePct} %) : seuil conseillé ${formaterDA(seuil)}, marge à ce prix ${formaterDA(margeVente(prix, produit.prix_achat, coutRep))}. Confirmer la vente ?`,
        seuil_minimum: seuil,
        marge_prevue: margeVente(prix, produit.prix_achat, coutRep),
      });
    }

    const venteId = await prisma.$transaction(async (tx) => {
      const vente = await tx.vente.create({
        data: {
          produit_id: produit.id,
          vendu_par: user.id,
          prix_vente_reel: prix,
          canal: canalTexte,
          date_vente: quand,
        },
      });
      await tx.produit.update({
        where: { id: produit.id },
        data: { statut: "vendu", prix_vente_reel: prix, date_vente: quand, en_vitrine: false },
      });
      // Vitrine par modèle : si l'unité vendue représentait le modèle en
      // vitrine, transférer le drapeau à un autre exemplaire identique en
      // stock pour que le modèle reste exposé (avec sa quantité décrémentée).
      if (produit.en_vitrine) {
        const modele = {
          reference: { equals: produit.reference.trim(), mode: "insensitive" as const },
          categorie: { equals: produit.categorie.trim(), mode: "insensitive" as const },
        };
        const encoreExpose = await tx.produit.count({
          where: { ...modele, id: { not: produit.id }, en_vitrine: true, statut: { not: "vendu" } },
        });
        if (encoreExpose === 0) {
          const remplacant = await tx.produit.findFirst({
            where: { ...modele, id: { not: produit.id }, statut: { not: "vendu" } },
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
      await tx.historiqueStatut.create({
        data: {
          produit_id: produit.id,
          user_id: user.id,
          statut_avant: "en_vente",
          statut_apres: "vendu",
          note: `Vendu ${formaterDA(prix)}${canalTexte ? ` — ${canalTexte}` : ""}`,
        },
      });
      await ajouterMouvement(tx, {
        montant: prix,
        type: "vente",
        user_id: user.id,
        produit_id: produit.id,
        date: quand,
        description: `Vente ${produit.reference}${canalTexte ? ` — ${canalTexte}` : ""}`,
      });
      const gerants = await idsParRole(tx, "gerant");
      await notifier(
        tx,
        gerants,
        `Vente enregistrée : ${produit.reference} — ${formaterDA(prix)} (${user.username})`,
        `/produits/${produit.id}`
      );
      // Toute vente génère automatiquement sa facture (garantie incluse).
      const facture = await creerFacture(tx, {
        lignes: [
          {
            produit_id: produit.id,
            vente_id: vente.id,
            code_interne: produit.code_interne,
            designation: produit.reference,
            categorie: produit.categorie,
            prix,
          },
        ],
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
      });

      // Audit Log
      await enregistrerActivite(tx, user.id, ACTIONS_JOURNAL.VENTE_ENREGISTRER, "produit", produit.id, { prix: prix, canal: canalTexte, vente_id: vente.id });

      return { venteId: vente.id, facture };
    });

    return NextResponse.json(
      {
        ok: true,
        vente_id: venteId.venteId,
        facture_id: venteId.facture.id,
        facture_numero: venteId.facture.numero,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/ventes", e);
    return erreur(500, "Erreur lors de l'enregistrement de la vente.");
  }
}
