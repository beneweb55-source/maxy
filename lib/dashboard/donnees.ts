import type { StatutProduit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculerSoldes, formaterDA, type MouvementPourCalcul } from "@/lib/caisse";
import { libelleStatut } from "@/lib/statuts";
import type { Utilisateur } from "@/lib/session";
import type { CleKpi, ConfigDashboard, SourceGraphique, SourceTableau } from "./config";
import type {
  Activite,
  AlerteProduit,
  DonneesDashboard,
  Kpi,
  DonneesGraphique,
  PointGraphique,
  TableauxDashboard,
} from "./types";

const JOUR_MS = 24 * 60 * 60 * 1000;
const STATUTS_DECISION: readonly StatutProduit[] = ["a_reparer", "manque_piece", "hs"];

function cleMois(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function debutMoisUTC(d: Date, decalage = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + decalage, 1));
}

function variation(courant: number, precedent: number): number | null {
  return precedent === 0
    ? null
    : Math.round(((courant - precedent) / Math.abs(precedent)) * 1000) / 10;
}

export async function chargerDonneesDashboard(
  user: Utilisateur,
  config: ConfigDashboard
): Promise<DonneesDashboard> {
  const clesKpi = new Set<CleKpi>();
  const sourcesGraphiques = new Set<SourceGraphique>();
  const sourcesTableaux = new Set<SourceTableau>();
  const clesCompteurs = new Set<string>();
  let besoinDonut = false;
  let besoinAlertes = false;
  let besoinActivites = false;
  let limiteActivites = 10;

  for (const widget of config.widgets) {
    switch (widget.type) {
      case "kpis":
        widget.cles.forEach((c) => clesKpi.add(c));
        break;
      case "graphique_barres":
        sourcesGraphiques.add(widget.source);
        break;
      case "donut_statuts":
        besoinDonut = true;
        break;
      case "alertes":
        besoinAlertes = true;
        break;
      case "activites":
        besoinActivites = true;
        limiteActivites = Math.max(limiteActivites, widget.limite ?? 10);
        break;
      case "tableau":
        sourcesTableaux.add(widget.source);
        break;
      case "actions_rapides":
        widget.actions.forEach((a) => {
          if (a.badge) clesCompteurs.add(a.badge);
        });
        break;
    }
  }

  const technicien = user.role === "technicien";
  if (technicien) clesKpi.delete("cash_disponible");

  const besoinVentes =
    clesKpi.has("benefice_mois") ||
    clesKpi.has("ca_mois") ||
    clesKpi.has("mon_ca_mois") ||
    clesKpi.has("mes_ventes_mois") ||
    sourcesGraphiques.size > 0 ||
    sourcesTableaux.has("dernieres_ventes");
  const besoinMouvements = clesKpi.has("cash_disponible");
  const besoinLotsTeste =
    sourcesTableaux.has("rapports_a_valider") || clesCompteurs.has("rapports_a_valider");

  const maintenant = new Date();
  const debutMoisCourant = debutMoisUTC(maintenant);
  const finMoisPrecedent = new Date(debutMoisCourant.getTime() - 1);
  const cleCourante = cleMois(maintenant);
  const clePrecedente = cleMois(finMoisPrecedent);

  const produitsPromise = prisma.produit.findMany({
    include: {
      lot: { select: { date_entree: true } },
      reparations: { select: { cout: true, date: true } },
      historique: {
        where: { statut_apres: { in: ["manque_piece", "en_vente"] } },
        orderBy: { created_at: "desc" },
        select: { statut_apres: true, created_at: true },
      },
    },
  });
  const ventesPromise = besoinVentes
    ? prisma.vente.findMany({
        include: {
          produit: {
            select: {
              prix_achat: true,
              reference: true,
              reparations: { select: { cout: true } },
            },
          },
          vendeur: { select: { username: true } },
        },
      })
    : null;
  const mouvementsPromise = besoinMouvements
    ? prisma.mouvementCaisse.findMany({
        orderBy: { date: "asc" },
        select: { type: true, montant: true, date: true },
      })
    : null;
  const lotsTestePromise = besoinLotsTeste
    ? prisma.lot.findMany({
        where: { statut_lot: "teste" },
        include: { produits: { select: { statut: true, decision_rapport: true } } },
      })
    : null;

  const produits = await produitsPromise;
  const ventes = ventesPromise ? await ventesPromise : [];
  const mouvements = mouvementsPromise ? await mouvementsPromise : [];
  const lotsTeste = lotsTestePromise ? await lotsTestePromise : [];

  const ventesValides = ventes.filter((v) => !v.annulee);
  const stockActuel = produits.filter((p) => p.statut !== "vendu");
  const margeDe = (v: (typeof ventes)[number]) =>
    v.prix_vente_reel -
    v.produit.prix_achat -
    v.produit.reparations.reduce((s, r) => s + r.cout, 0);

  const kpis: Partial<Record<CleKpi, Kpi>> = {};

  const serieMensuelle = (valeurDe: (v: (typeof ventes)[number]) => number) => {
    const parMois = new Map<string, number>();
    for (const v of ventesValides) {
      const cle = cleMois(v.date_vente);
      parMois.set(cle, (parMois.get(cle) ?? 0) + valeurDe(v));
    }
    return parMois;
  };
  const kpiMensuel = (parMois: Map<string, number>): Kpi => {
    const courant = parMois.get(cleCourante) ?? 0;
    return { valeur: courant, variation_pct: variation(courant, parMois.get(clePrecedente) ?? 0) };
  };

  const margesParMois =
    clesKpi.has("benefice_mois") || sourcesGraphiques.has("benefices_6_mois")
      ? serieMensuelle(margeDe)
      : null;
  const caParMois =
    clesKpi.has("ca_mois") || sourcesGraphiques.has("ca_6_mois")
      ? serieMensuelle((v) => v.prix_vente_reel)
      : null;

  if (clesKpi.has("benefice_mois") && margesParMois) {
    kpis.benefice_mois = kpiMensuel(margesParMois);
  }
  if (clesKpi.has("ca_mois") && caParMois) {
    kpis.ca_mois = kpiMensuel(caParMois);
  }
  if (clesKpi.has("cash_disponible")) {
    const enCalcul = (liste: typeof mouvements): MouvementPourCalcul[] =>
      liste.map((m) => ({ type: m.type, montant: m.montant }));
    const actuel = calculerSoldes(enCalcul(mouvements)).disponible;
    const avant = calculerSoldes(
      enCalcul(mouvements.filter((m) => m.date < debutMoisCourant))
    ).disponible;
    kpis.cash_disponible = { valeur: actuel, variation_pct: variation(actuel, avant) };
  }
  if (clesKpi.has("valeur_stock") || clesKpi.has("temps_stock_moyen")) {
    const stockA = (date: Date) =>
      produits.filter(
        (p) => p.lot.date_entree <= date && (p.date_vente === null || p.date_vente > date)
      );
    if (clesKpi.has("valeur_stock")) {
      const valeurA = (date: Date) =>
        stockA(date).reduce(
          (somme, p) =>
            somme +
            p.prix_achat +
            p.reparations.filter((r) => r.date <= date).reduce((s, r) => s + r.cout, 0),
          0
        );
      kpis.valeur_stock = {
        valeur: valeurA(maintenant),
        variation_pct: variation(valeurA(maintenant), valeurA(finMoisPrecedent)),
      };
    }
    if (clesKpi.has("temps_stock_moyen")) {
      const tempsA = (date: Date) => {
        const stock = stockA(date);
        if (stock.length === 0) return 0;
        const total = stock.reduce(
          (s, p) => s + Math.max(0, date.getTime() - p.lot.date_entree.getTime()),
          0
        );
        return Math.round(total / stock.length / JOUR_MS);
      };
      kpis.temps_stock_moyen = {
        valeur: tempsA(maintenant),
        variation_pct: variation(tempsA(maintenant), tempsA(finMoisPrecedent)),
      };
    }
  }
  if (clesKpi.has("nb_en_vente")) {
    kpis.nb_en_vente = {
      valeur: stockActuel.filter((p) => p.statut === "en_vente").length,
      variation_pct: null,
    };
  }
  if (clesKpi.has("nb_en_stock")) {
    kpis.nb_en_stock = {
      valeur: stockActuel.length,
      variation_pct: null,
    };
  }
  if (clesKpi.has("valeur_en_vente")) {
    kpis.valeur_en_vente = {
      valeur: stockActuel
        .filter((p) => p.statut === "en_vente")
        .reduce((s, p) => s + (p.prix_vente_fixe ?? 0), 0),
      variation_pct: null,
    };
  }
  if (clesKpi.has("mon_ca_mois") || clesKpi.has("mes_ventes_mois")) {
    const miennes = ventesValides.filter((v) => v.vendu_par === user.id);
    const caMien = new Map<string, number>();
    const nbMien = new Map<string, number>();
    for (const v of miennes) {
      const cle = cleMois(v.date_vente);
      caMien.set(cle, (caMien.get(cle) ?? 0) + v.prix_vente_reel);
      nbMien.set(cle, (nbMien.get(cle) ?? 0) + 1);
    }
    if (clesKpi.has("mon_ca_mois")) kpis.mon_ca_mois = kpiMensuel(caMien);
    if (clesKpi.has("mes_ventes_mois")) kpis.mes_ventes_mois = kpiMensuel(nbMien);
  }

  const graphiques: Partial<Record<SourceGraphique, DonneesGraphique>> = {};
    const genererDonneesGraphique = (valeurDe: (v: (typeof ventes)[number]) => number): DonneesGraphique => {
    const jours = new Map<string, number>();
    const moisMap = new Map<string, number>();
    const ans = new Map<string, number>();

    for (const v of ventesValides) {
      const d = v.date_vente;
      const cleJour = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const cleMoisStr = cleMois(d);
      const cleAn = `${d.getUTCFullYear()}`;

      jours.set(cleJour, (jours.get(cleJour) ?? 0) + valeurDe(v));
      moisMap.set(cleMoisStr, (moisMap.get(cleMoisStr) ?? 0) + valeurDe(v));
      ans.set(cleAn, (ans.get(cleAn) ?? 0) + valeurDe(v));
    }

    const serieJours: PointGraphique[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(maintenant.getTime() - (29 - i) * JOUR_MS);
      const cle = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      return { label: cle, valeur: jours.get(cle) ?? 0 };
    });

    const serieMois: PointGraphique[] = Array.from({ length: 12 }, (_, i) => {
      const cle = cleMois(debutMoisUTC(maintenant, i - 11));
      return { label: cle, valeur: moisMap.get(cle) ?? 0 };
    });

    const serieAns: PointGraphique[] = Array.from({ length: 3 }, (_, i) => {
      const annee = maintenant.getUTCFullYear() - 2 + i;
      const cle = `${annee}`;
      return { label: cle, valeur: ans.get(cle) ?? 0 };
    });

    return { jour: serieJours, mois: serieMois, an: serieAns };
  };

  if (sourcesGraphiques.has("benefices_6_mois")) {
    graphiques.benefices_6_mois = genererDonneesGraphique(margeDe);
  }
  if (sourcesGraphiques.has("ca_6_mois")) {
    graphiques.ca_6_mois = genererDonneesGraphique((v) => v.prix_vente_reel);
  }

  let stock_par_statut: DonneesDashboard["stock_par_statut"];
  if (besoinDonut) {
    const compte = new Map<StatutProduit, number>();
    for (const p of stockActuel) compte.set(p.statut, (compte.get(p.statut) ?? 0) + 1);
    stock_par_statut = Array.from(compte.entries()).map(([statut, nombre]) => ({
      statut,
      nombre,
    }));
  }

  let alertes: DonneesDashboard["alertes"];
  if (besoinAlertes) {
    const seuil30 = new Date(maintenant.getTime() - 30 * JOUR_MS);
    const enJours = (depuis: Date) =>
      Math.floor((maintenant.getTime() - depuis.getTime()) / JOUR_MS);
    const stock_30j: AlerteProduit[] = stockActuel
      .filter((p) => p.lot.date_entree < seuil30)
      .map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        jours: enJours(p.lot.date_entree),
      }))
      .sort((a, b) => b.jours - a.jours);
    const manque_piece_14j: AlerteProduit[] = stockActuel
      .filter((p) => p.statut === "manque_piece")
      .map((p) => {
        const depuis =
          p.historique.find((h) => h.statut_apres === "manque_piece")?.created_at ??
          p.lot.date_entree;
        return {
          id: p.id,
          code_interne: p.code_interne,
          reference: p.reference,
          jours: enJours(depuis),
        };
      })
      .filter((p) => p.jours > 14)
      .sort((a, b) => b.jours - a.jours);
    const hs: AlerteProduit[] = stockActuel
      .filter((p) => p.statut === "hs")
      .map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.a_jeter ? `${p.reference} · à jeter` : p.reference,
        jours: enJours(p.lot.date_entree),
      }))
      .sort((a, b) => b.jours - a.jours);
    alertes = { stock_30j, manque_piece_14j, hs };
  }

  const tableaux: TableauxDashboard = {};
  if (sourcesTableaux.has("produits_en_vente")) {
    tableaux.produits_en_vente = stockActuel
      .filter((p) => p.statut === "en_vente")
      .map((p) => {
        const enVenteDepuis =
          p.historique.find((h) => h.statut_apres === "en_vente")?.created_at ??
          p.lot.date_entree;
        return {
          id: p.id,
          code_interne: p.code_interne,
          reference: p.reference,
          prix_vente_fixe: p.prix_vente_fixe,
          marge_prevue:
            (p.prix_vente_fixe ?? 0) -
            p.prix_achat -
            p.reparations.reduce((s, r) => s + r.cout, 0),
          jours_en_vente: Math.floor(
            (maintenant.getTime() - enVenteDepuis.getTime()) / JOUR_MS
          ),
        };
      })
      .sort((a, b) => b.jours_en_vente - a.jours_en_vente);
  }
  if (sourcesTableaux.has("rapports_a_valider")) {
    tableaux.rapports_a_valider = lotsTeste.map((lot) => {
      const concernes = lot.produits.filter((p) => STATUTS_DECISION.includes(p.statut));
      return {
        lot_id: lot.id,
        fournisseur: lot.fournisseur,
        date_entree: lot.date_entree.toISOString(),
        nb_produits: lot.produits.length,
        decisions_prises: concernes.filter((p) => p.decision_rapport !== null).length,
        decisions_requises: concernes.length,
      };
    });
  }
  if (sourcesTableaux.has("produits_a_tarifer")) {
    tableaux.produits_a_tarifer = stockActuel
      .filter((p) => p.statut === "ok")
      .map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        categorie: p.categorie,
        prix_achat: p.prix_achat,
        cout_reparations: p.reparations.reduce((s, r) => s + r.cout, 0),
      }));
  }
  if (sourcesTableaux.has("dernieres_ventes")) {
    tableaux.dernieres_ventes = [...ventes]
      .sort((a, b) => b.date_vente.getTime() - a.date_vente.getTime())
      .slice(0, 8)
      .map((v) => ({
        id: v.id,
        reference: v.produit.reference,
        prix_vente_reel: v.prix_vente_reel,
        marge: margeDe(v),
        vendeur: v.vendeur.username,
        quand: v.date_vente.toISOString(),
        annulee: v.annulee,
      }));
  }

  const compteurs: Record<string, number> = {};
  if (clesCompteurs.has("en_vente")) {
    compteurs.en_vente = stockActuel.filter((p) => p.statut === "en_vente").length;
  }
  if (clesCompteurs.has("produits_a_tarifer")) {
    compteurs.produits_a_tarifer = stockActuel.filter((p) => p.statut === "ok").length;
  }
  if (clesCompteurs.has("rapports_a_valider")) {
    compteurs.rapports_a_valider = lotsTeste.length;
  }

  let activites: Activite[] | undefined;
  if (besoinActivites) {
    const [historiquesRecents, ventesRecentes, mouvementsRecents, utilisateurs] =
      await Promise.all([
        prisma.historiqueStatut.findMany({
          orderBy: { created_at: "desc" },
          take: 15,
          include: {
            user: { select: { username: true } },
            produit: { select: { code_interne: true, reference: true } },
          },
        }),
        prisma.vente.findMany({
          orderBy: { date_vente: "desc" },
          take: 15,
          include: {
            vendeur: { select: { username: true } },
            produit: { select: { reference: true } },
          },
        }),
        prisma.mouvementCaisse.findMany({
          orderBy: { date: "desc" },
          take: 15,
          include: { user: { select: { username: true } } },
        }),
        prisma.user.findMany({ select: { id: true, username: true } }),
      ]);
    const nomPar = new Map(utilisateurs.map((u) => [u.id, u.username]));

    const toutes: Activite[] = [];
    for (const hi of historiquesRecents) {
      if (hi.statut_avant === null || hi.statut_apres === "vendu" || hi.statut_avant === "vendu") {
        continue;
      }
      toutes.push({
        type: "statut",
        message: `${hi.produit.code_interne} · ${hi.produit.reference} : ${libelleStatut(hi.statut_avant)} → ${libelleStatut(hi.statut_apres)}`,
        qui: hi.user.username,
        quand: hi.created_at.toISOString(),
      });
    }
    for (const v of ventesRecentes) {
      toutes.push({
        type: "vente",
        message: `Vente : ${v.produit.reference} — ${formaterDA(v.prix_vente_reel)}${v.canal ? ` (${v.canal})` : ""}`,
        qui: v.vendeur.username,
        quand: v.date_vente.toISOString(),
      });
      if (v.annulee && v.annulee_at) {
        toutes.push({
          type: "vente",
          message: `Vente annulée : ${v.produit.reference}${v.motif_annulation ? ` — ${v.motif_annulation}` : ""}`,
          qui: (v.annulee_par !== null && nomPar.get(v.annulee_par)) || "?",
          quand: v.annulee_at.toISOString(),
        });
      }
    }
    for (const m of mouvementsRecents) {
      if (m.type === "vente" || m.type === "annulation_vente") continue;
      if (m.type === "achat_lot") {
        toutes.push({
          type: "arrivage",
          message: `Arrivage : ${m.description ?? "nouveau lot"}`,
          qui: m.user.username,
          quand: m.date.toISOString(),
        });
      } else {
        toutes.push({
          type: "caisse",
          message: `Caisse : ${m.description ?? m.type} — ${formaterDA(m.montant)}`,
          qui: m.user.username,
          quand: m.date.toISOString(),
        });
      }
    }

    activites = toutes
      .filter((a) => !technicien || a.type !== "caisse")
      .sort((a, b) => (a.quand < b.quand ? 1 : -1))
      .slice(0, limiteActivites);
  }

  return {
    kpis,
    graphiques,
    stock_par_statut,
    alertes,
    activites,
    tableaux,
    compteurs,
  };
}
