"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role, TypeMouvement } from "@prisma/client";
import Link from "next/link";
import Modale from "@/components/Modale";
import { useToast } from "@/components/toast";
import { formaterDA, sensMouvement, TYPES_MANUELS } from "@/lib/caisse";
import {
  IconeAlerte,
  IconeChevronGauche,
  IconeChevronDroite,
  IconeCocheCercle,
  IconeTelechargement,
  IconeStore,
} from "@/components/icons";
import { Store, Truck, Layers, Wallet, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Banknote } from "lucide-react";
import { useT } from "@/lib/i18n/contexte";

interface MouvementDto {
  id: number;
  date: string;
  type: TypeMouvement;
  montant: number;
  solde_apres: number;
  description: string | null;
  par: string;
  caisse?: "CAISSE_PHYSIQUE" | "CAISSE_YALIDINE";
}

interface ReponseCaisse {
  soldes: {
    total: number;
    reserve: number;
    disponible: number;
    physique?: { total: number; reserve?: number; disponible: number };
    yalidine?: { total: number; reserve?: number; disponible: number };
  };
  parametres: { marge_minimum_pct: number; objectif_reserve: number };
  graphique_soldes: { jour: {label: string, solde: number}[], mois: {label: string, solde: number}[], an: {label: string, solde: number}[] };
  repartition: { mois: string; deja_appliquee: boolean; benefice_mois: number };
  page: number;
  pages: number;
  total: number;
  mouvements: MouvementDto[];
}

export const LIBELLES_TYPE: Record<TypeMouvement, string> = {
  achat_lot: "caisseDashboard.types.achat_lot",
  vente: "caisseDashboard.types.vente",
  annulation_vente: "caisseDashboard.types.annulation_vente",
  apport_associe: "caisseDashboard.types.apport_associe",
  achat_piece: "caisseDashboard.types.achat_piece",
  frais: "caisseDashboard.types.frais",
  retrait_parts: "caisseDashboard.types.retrait_parts",
  transfert_reserve: "caisseDashboard.types.transfert_reserve",
  reinvest: "caisseDashboard.types.reinvest",
  sortie: "caisseDashboard.types.sortie",
};

export default function CaisseDashboard({ role }: { role: Role }) {
  const { afficher } = useToast();
  const t = useT();
  const [donnees, setDonnees] = useState<ReponseCaisse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [envoi, setEnvoi] = useState(false);

  const [filtreCaisse, setFiltreCaisse] = useState<"TOUTES" | "CAISSE_PHYSIQUE" | "CAISSE_YALIDINE">("TOUTES");
  const [caisseCibleMouvement, setCaisseCibleMouvement] = useState<"CAISSE_PHYSIQUE" | "CAISSE_YALIDINE">("CAISSE_PHYSIQUE");

  const [typeMouvement, setTypeMouvement] = useState<TypeMouvement>("apport_associe");
  const [montant, setMontant] = useState("");
  const [description, setDescription] = useState("");
  const [confirmationMouvement, setConfirmationMouvement] = useState<string | null>(null);

  const [confirmationRepartition, setConfirmationRepartition] = useState<string | null>(null);
  const [pctReinvest, setPctReinvest] = useState(50);
  const [pctReserve, setPctReserve] = useState(20);
  const [pctParts, setPctParts] = useState(20);
  const [pctFrais, setPctFrais] = useState(10);

  const estGerant = role === "gerant";

  const rafraichir = useCallback(async () => {
    try {
      const url = `/api/caisse?page=${page}${filtreCaisse !== "TOUTES" ? `&caisse=${filtreCaisse}` : ""}`;
      const res = await fetch(url);
      const corps = (await res.json().catch(() => null)) as
        | ReponseCaisse
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      
      setErreur(null);
      setDonnees((prev) => {
        if (!prev) {
          const d = corps as any;
          if (d.parametres) {
            setPctReinvest(d.parametres.pct_reinvest ?? 50);
            setPctReserve(d.parametres.pct_reserve ?? 20);
            setPctParts(d.parametres.pct_parts ?? 20);
            setPctFrais(d.parametres.pct_frais ?? 10);
          }
        }
        return corps as ReponseCaisse;
      });
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [page, filtreCaisse]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  async function enregistrerMouvement(confirmer: boolean) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/caisse/mouvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: typeMouvement,
          montant: Number(montant),
          description: description.trim() || undefined,
          confirmer: confirmer || undefined,
          caisse: caisseCibleMouvement,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'enregistrement.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setConfirmationMouvement(corps.message ?? "Confirmer ce mouvement ?");
        return;
      }
      afficher(
        `Mouvement enregistré : ${t(LIBELLES_TYPE[typeMouvement])} — ${formaterDA(Number(montant))}.`
      );
      setMontant("");
      setDescription("");
      setConfirmationMouvement(null);
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function appliquerRepartition(confirmer: boolean) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/caisse/repartition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmer: confirmer || undefined,
          pctReinvest,
          pctReserve,
          pctParts,
          pctFrais
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            confirmation_required?: boolean;
            message?: string;
            error?: string;
            parts_vers_reserve?: boolean;
          }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la répartition.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setConfirmationRepartition(corps.message ?? "Confirmer la répartition ?");
        return;
      }
      afficher(
        corps?.parts_vers_reserve
          ? "Répartition appliquée — parts redirigées vers la réserve."
          : "Répartition mensuelle appliquée (4 mouvements créés)."
      );
      setConfirmationRepartition(null);
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  if (erreur && !donnees) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}
      </div>
    );
  }
  if (!donnees)
    return (
      <div className="space-y-6 animate-entree p-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-brand-light-grey/40 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-brand-light-grey/30 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="carte p-4 space-y-2">
              <div className="h-4 w-24 bg-brand-light-grey/40 rounded animate-pulse" />
              <div className="h-8 w-32 bg-brand-light-grey/50 rounded-lg animate-pulse" />
              <div className="h-3 w-full bg-brand-light-grey/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );

  const { soldes, parametres, repartition } = donnees;
  const pctAtteintReserve =
    parametres.objectif_reserve > 0
      ? Math.min(100, Math.round((soldes.reserve / parametres.objectif_reserve) * 100))
      : 100;

  const benefice = repartition.benefice_mois;

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">{t("caisseDashboard.titreCaisse")}</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto mt-2 lg:mt-0">
          <Link href="/pos" className="btn btn-primaire bg-brand-orange border-brand-orange hover:bg-brand-orange/90 text-white font-black shadow-md flex items-center justify-center gap-2 w-full sm:w-auto">
            <IconeStore taille={20} /> Ouvrir la Caisse Enregistreuse
          </Link>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/caisse/rapport" className="btn btn-secondaire flex-1 flex items-center justify-center">
              Créer un rapport
            </Link>
            <a href="/api/caisse/export" className="btn btn-secondaire flex-1 flex items-center justify-center">
              <IconeTelechargement taille={15} />
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* SECTION PRINCIPALE : LES DEUX CAISSES CÔTE À CÔTE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CARTE 1 : CAISSE NORMALE (MAGASIN / COMPTOIR) */}
        <div 
          onClick={() => {
            setFiltreCaisse((prev) => (prev === "CAISSE_PHYSIQUE" ? "TOUTES" : "CAISSE_PHYSIQUE"));
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-3xl p-6 border-2 transition-all cursor-pointer shadow-sm ${
            filtreCaisse === "CAISSE_PHYSIQUE"
              ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
              : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Caisse Normale</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Magasin &amp; Comptoir
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Ventes physiques directes, espèces &amp; opérations courantes
                </p>
              </div>
            </div>
            {filtreCaisse === "CAISSE_PHYSIQUE" && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
                Filtre actif
              </span>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-end justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Disponible Caisse Normale
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {formaterDA(soldes.physique?.disponible ?? soldes.disponible)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Mouvements</span>
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">
                {formaterDA(soldes.physique?.total ?? soldes.total)}
              </span>
            </div>
          </div>
        </div>

        {/* CARTE 2 : CAISSE YALIDINE (EXPÉDITIONS & RECOUVREMENTS) */}
        <div 
          onClick={() => {
            setFiltreCaisse((prev) => (prev === "CAISSE_YALIDINE" ? "TOUTES" : "CAISSE_YALIDINE"));
            setPage(1);
          }}
          className={`relative overflow-hidden rounded-3xl p-6 border-2 transition-all cursor-pointer shadow-sm ${
            filtreCaisse === "CAISSE_YALIDINE"
              ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
              : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Caisse Yalidine</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Livraisons &amp; Colis
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Fonds recouvrés auprès des livreurs et bordereaux Yalidine
                </p>
              </div>
            </div>
            {filtreCaisse === "CAISSE_YALIDINE" && (
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2.5 py-1 rounded-full">
                Filtre actif
              </span>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-end justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Disponible Caisse Yalidine
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
                {formaterDA(soldes.yalidine?.disponible ?? 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Recouvré</span>
              <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">
                {formaterDA(soldes.yalidine?.total ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SYNTHÈSE GLOBALE & RÉSERVE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="carte">
          <p className="libelle">{t("caisseDashboard.soldeTotal")} (Consolidé)</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formaterDA(soldes.total)}</p>
          <p className="text-xs text-brand-warm-grey mt-1">Cumul Magasin + Yalidine</p>
        </div>
        <div className="carte">
          <p className="libelle">{t("caisseDashboard.fondsReserve")}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formaterDA(soldes.reserve)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-light-grey">
            <div
              className={`h-full rounded-full ${pctAtteintReserve >= 100 ? "bg-succes" : "bg-brand-orange"}`}
              style={{ width: `${pctAtteintReserve}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-brand-warm-grey">
            {pctAtteintReserve} % de l'objectif ({formaterDA(parametres.objectif_reserve)})
          </p>
        </div>
        <div className="carte">
          <p className="libelle">{t("caisseDashboard.disponible")} Total</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {formaterDA(soldes.disponible)}
          </p>
          <p className="text-xs text-brand-warm-grey mt-1">Trésorerie nette hors réserve</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="carte">
          <h2 className="libelle text-brand-smooth">Évolution du solde — 6 mois</h2>
          <GraphiqueLigne donnees={donnees.graphique_soldes} />
        </section>

        <section className="carte">
          <h2 className="libelle text-brand-smooth">
            Répartition mensuelle — {repartition.mois}
          </h2>
          {repartition.deja_appliquee ? (
            <p className="bandeau-succes mt-3 flex items-center gap-2">
              <IconeCocheCercle taille={15} />
              Répartition déjà appliquée ce mois-ci (une seule par mois).
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm">
                Bénéfice du mois (somme des marges des ventes) :{" "}
                <strong>{formaterDA(benefice)}</strong>
              </p>
              {benefice > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-brand-light-grey/20 p-2 rounded text-sm">
                    <span className="text-brand-warm-grey">{t("caisseDashboard.totalPourcentages")}</span>
                    <span className={`font-bold ${pctReinvest + pctReserve + pctParts + pctFrais !== 100 ? "text-danger" : "text-succes"}`}>
                      {pctReinvest + pctReserve + pctParts + pctFrais} %
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-brand-light-grey/50">
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Réinvestissement
                          <input type="number" min="0" max="100" value={pctReinvest} onChange={e => setPctReinvest(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">{formaterDA(Math.round(benefice * (pctReinvest / 100)))}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Fonds de réserve
                          <input type="number" min="0" max="100" value={pctReserve} onChange={e => setPctReserve(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctReserve / 100)))}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Parts associés
                          <input type="number" min="0" max="100" value={pctParts} onChange={e => setPctParts(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctParts / 100)))}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Frais divers
                          <input type="number" min="0" max="100" value={pctFrais} onChange={e => setPctFrais(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctFrais / 100)))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {estGerant ? (
                <button
                  type="button"
                  disabled={envoi || benefice <= 0 || (pctReinvest + pctReserve + pctParts + pctFrais !== 100)}
                  onClick={() => {
                    setConfirmationRepartition(
                      `Confirmez-vous la répartition de ${formaterDA(benefice)} avec ces pourcentages : Réinvest. (${pctReinvest}%), Réserve (${pctReserve}%), Parts (${pctParts}%), Frais (${pctFrais}%) ?`
                    );
                  }}
                  title={benefice <= 0 ? "Aucun bénéfice à répartir ce mois-ci" : undefined}
                  className="btn btn-primaire w-full"
                >
                  Appliquer la répartition
                </button>
              ) : (
                <p className="text-xs text-brand-warm-grey">
                  Seul le gérant applique la répartition.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {estGerant && (
        <section className="carte space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              sensMouvement(typeMouvement) === "entree"
                ? "bg-emerald-100 text-emerald-600"
                : sensMouvement(typeMouvement) === "sortie"
                ? "bg-red-100 text-red-600"
                : "bg-brand-orange/10 text-brand-orange"
            }`}>
              {sensMouvement(typeMouvement) === "entree"
                ? <ArrowDownToLine className="w-5 h-5" />
                : sensMouvement(typeMouvement) === "sortie"
                ? <ArrowUpFromLine className="w-5 h-5" />
                : <ArrowRightLeft className="w-5 h-5" />
              }
            </div>
            <div>
              <h2 className="libelle text-brand-smooth">{t("caisseDashboard.nouveauMouvementManuel")}</h2>
              <p className="text-[11px] text-brand-warm-grey mt-0.5">
                {sensMouvement(typeMouvement) === "entree"
                  ? "Ajouter de l'argent dans une caisse"
                  : sensMouvement(typeMouvement) === "sortie"
                  ? "Retirer de l'argent d'une caisse"
                  : "Transfert ou opération interne"}
              </p>
            </div>
          </div>

          {/* Raccourcis rapides pour les types les plus courants */}
          <div className="flex flex-wrap gap-2">
            {[
              { type: "apport_associe" as TypeMouvement, label: "Ajouter", icon: <ArrowDownToLine className="w-3.5 h-3.5" />, color: "emerald" },
              { type: "retrait_parts" as TypeMouvement, label: "Retirer", icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, color: "red" },
              { type: "frais" as TypeMouvement, label: "Frais", icon: <Wallet className="w-3.5 h-3.5" />, color: "red" },
              { type: "achat_piece" as TypeMouvement, label: "Achat pièce", icon: <Banknote className="w-3.5 h-3.5" />, color: "red" },
            ].map(({ type, label, icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeMouvement(type)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                  typeMouvement === type
                    ? color === "emerald"
                      ? "bg-emerald-500 text-white shadow-md"
                      : "bg-danger text-white shadow-md"
                    : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
            <div>
              <label className="libelle mb-1.5" htmlFor="type-mvt">
                Type de mouvement
              </label>
              <select
                id="type-mvt"
                value={typeMouvement}
                onChange={(e) => setTypeMouvement(e.target.value as TypeMouvement)}
                className="champ w-full sm:w-auto"
              >
                {TYPES_MANUELS.map((typeMvt) => (
                  <option key={typeMvt} value={typeMvt}>
                    {sensMouvement(typeMvt) === "entree" ? "↓ " : sensMouvement(typeMvt) === "sortie" ? "↑ " : ""}
                    {t(LIBELLES_TYPE[typeMvt])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="montant-mvt">
                Montant (DA)
              </label>
              <input
                id="montant-mvt"
                type="number"
                min={1}
                step={1}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0"
                className={`champ w-full sm:w-40 text-lg font-bold ${
                  sensMouvement(typeMouvement) === "entree"
                    ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    : sensMouvement(typeMouvement) === "sortie"
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : ""
                }`}
              />
              <div className="flex gap-1.5 mt-1.5">
                {[1000, 5000, 10000, 25000, 50000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMontant(String(v))}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10"
                  >
                    {v >= 1000 ? `${v / 1000}K` : v} DA
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 sm:min-w-48 flex-1">
              <label className="libelle mb-1.5" htmlFor="desc-mvt">
                Description
              </label>
              <input
                id="desc-mvt"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex. Achat clavier, remboursement..."
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="caisse-mvt">
                Caisse
              </label>
              <select
                id="caisse-mvt"
                value={caisseCibleMouvement}
                onChange={(e) => setCaisseCibleMouvement(e.target.value as any)}
                className="champ w-full sm:w-auto font-bold text-xs"
              >
                <option value="CAISSE_PHYSIQUE">Caisse Physique (Magasin)</option>
                <option value="CAISSE_YALIDINE">Caisse Yalidine (Expéditions)</option>
              </select>
            </div>
            <button
              type="button"
              disabled={envoi || !montant.trim()}
              onClick={() => void enregistrerMouvement(false)}
              className={`btn flex items-center gap-2 ${
                sensMouvement(typeMouvement) === "entree"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : sensMouvement(typeMouvement) === "sortie"
                  ? "bg-danger hover:bg-danger/90 text-white"
                  : "btn-primaire"
              }`}
            >
              {sensMouvement(typeMouvement) === "entree"
                ? <><ArrowDownToLine className="w-4 h-4" /> Ajouter</>
                : sensMouvement(typeMouvement) === "sortie"
                ? <><ArrowUpFromLine className="w-4 h-4" /> Retirer</>
                : "Enregistrer"
              }
            </button>
          </div>
          <p className="text-xs text-brand-warm-grey">
            Les mouvements achat de lot, vente et annulation de vente sont créés automatiquement
            par le système. Rien ne se supprime jamais.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="libelle text-brand-smooth">
            Historique ({donnees.total} mouvement{donnees.total > 1 ? "s" : ""})
          </h2>

          {/* Onglets Filtres de Caisse */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-800 p-1 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setFiltreCaisse("TOUTES"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filtreCaisse === "TOUTES"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Toutes les caisses
            </button>
            <button
              type="button"
              onClick={() => { setFiltreCaisse("CAISSE_PHYSIQUE"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filtreCaisse === "CAISSE_PHYSIQUE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-emerald-600"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Caisse Normale
            </button>
            <button
              type="button"
              onClick={() => { setFiltreCaisse("CAISSE_YALIDINE"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filtreCaisse === "CAISSE_YALIDINE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Caisse Yalidine
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Vue Mobile: Cartes */}
          <div className="flex flex-col gap-3 md:hidden">
            {donnees.mouvements.length === 0 && (
              <div className="carte border-dashed text-center p-6 text-brand-warm-grey text-sm">
                Aucun mouvement pour le moment dans cette caisse.
              </div>
            )}
            {donnees.mouvements.map((m) => {
              const sens = sensMouvement(m.type);
              const estYalidine = m.caisse === "CAISSE_YALIDINE";
              return (
                <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-brand-light-grey bg-brand-white p-4 shadow-sm text-sm">
                  <div className="flex items-start justify-between border-b border-brand-light-grey/50 pb-2 mb-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-brand-black">{t(LIBELLES_TYPE[m.type])}</span>
                        {estYalidine ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Truck className="w-2.5 h-2.5" /> Yalidine
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Store className="w-2.5 h-2.5" /> Magasin
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-brand-warm-grey">
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${sens === "entree" ? "text-succes" : sens === "sortie" ? "text-danger" : "text-brand-warm-grey"}`}>
                        {sens === "entree" ? "+" : sens === "sortie" ? "−" : "="} {formaterDA(m.montant)}
                      </span>
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs text-brand-smooth break-words">{m.description}</p>
                  )}
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-brand-light-grey/50">
                    <span className="text-xs text-brand-warm-grey">{t("caisseDashboard.par")}: {m.par}</span>
                    <span className="text-xs text-brand-grey">Solde: <span className="font-bold text-brand-black">{formaterDA(m.solde_apres)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vue Bureau: Tableau */}
          <div className="hidden w-full overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-brand-light-grey/25">
                <tr>
                  <th className="entete-table">{t("caisseDashboard.colDate")}</th>
                  <th className="entete-table">Caisse</th>
                  <th className="entete-table">{t("caisseDashboard.colType")}</th>
                  <th className="entete-table">{t("caisseDashboard.colMotif")}</th>
                  <th className="entete-table">{t("caisseDashboard.par")}</th>
                  <th className="entete-table text-right">{t("caisseDashboard.colMontant")}</th>
                  <th className="entete-table text-right">{t("caisseDashboard.soldeApres")}</th>
                </tr>
              </thead>
              <tbody className="">
                {donnees.mouvements.length === 0 && (
                  <tr className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                    <td colSpan={7} className="px-3 py-6 text-center text-brand-warm-grey">
                      Aucun mouvement pour le moment dans cette caisse.
                    </td>
                  </tr>
                )}
                {donnees.mouvements.map((m) => {
                  const sens = sensMouvement(m.type);
                  const estYalidine = m.caisse === "CAISSE_YALIDINE";
                  return (
                    <tr key={m.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                      <td className="px-3 py-2 text-xs">
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {estYalidine ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Truck className="w-3 h-3" /> Yalidine
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Store className="w-3 h-3" /> Magasin
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{t(LIBELLES_TYPE[m.type])}</td>
                      <td
                        className="max-w-72 truncate px-3 py-2 text-brand-warm-grey"
                        title={m.description ?? ""}
                      >
                        {m.description ?? "—"}
                      </td>
                      <td className="px-3 py-2">{m.par}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          sens === "entree"
                            ? "text-succes"
                            : sens === "sortie"
                              ? "text-danger"
                              : "text-brand-warm-grey"
                        }`}
                      >
                        {sens === "entree" ? "+" : sens === "sortie" ? "−" : "="}{" "}
                        {formaterDA(m.montant)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formaterDA(m.solde_apres)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {donnees.pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn btn-secondaire"
            >
              <IconeChevronGauche taille={15} />
              Précédent
            </button>
            <span className="px-2 text-brand-warm-grey">
              Page {page} / {donnees.pages}
            </span>
            <button
              type="button"
              disabled={page >= donnees.pages}
              onClick={() => setPage(page + 1)}
              className="btn btn-secondaire"
            >
              Suivant
              <IconeChevronDroite taille={15} />
            </button>
          </div>
        )}
      </section>

      <Modale
        titre="Confirmation requise"
        ouverte={confirmationMouvement !== null}
        onFermer={() => setConfirmationMouvement(null)}
      >
        <p className="flex items-start gap-2 text-sm text-brand-smooth">
          <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
          {confirmationMouvement}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmationMouvement(null)}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() => void enregistrerMouvement(true)}
            className="btn btn-primaire"
          >
            Confirmer le mouvement
          </button>
        </div>
      </Modale>

      <Modale
        titre="Confirmation requise"
        ouverte={confirmationRepartition !== null}
        onFermer={() => setConfirmationRepartition(null)}
      >
        <p className="flex items-start gap-2 text-sm text-brand-smooth">
          <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
          {confirmationRepartition}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmationRepartition(null)}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() => void appliquerRepartition(true)}
            className="btn btn-primaire"
          >
            Confirmer la répartition
          </button>
        </div>
      </Modale>
    </div>
  );
}

function formatLabel(cle: string, granularite: 'jour' | 'mois' | 'an'): string {
  if (granularite === 'an') return cle;
  const parts = cle.split("-");
  if (granularite === 'jour') {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString("fr-FR", { day: 'numeric', month: "short", timeZone: "UTC" });
  }
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}

function GraphiqueLigne({ donnees }: { donnees: { jour: {label: string, solde: number}[], mois: {label: string, solde: number}[], an: {label: string, solde: number}[] } }) {
  const [granularite, setGranularite] = useState<'jour' | 'mois' | 'an'>('mois');
  const series = donnees ? donnees[granularite] : [];

  if (!series || series.length === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune donnée pour cette période.</p>;
  }

  const largeur = 480;
  const hauteur = 180;
  const margeBas = 24;
  const margeHaut = 20;
  const valeurs = series.map((s) => s.solde);
  const minimum = Math.min(0, ...valeurs);
  const maximum = Math.max(1, ...valeurs);
  const pas = largeur / Math.max(1, series.length - 1);
  
  const y = (v: number) =>
    hauteur -
    margeBas -
    (maximum === minimum ? 0 : ((v - minimum) / (maximum - minimum)) * (hauteur - margeBas - margeHaut));
  
  const points = series.map((s, i) => `${i * pas},${y(s.solde)}`).join(" ");

  return (
    <div className="mt-3">
      <div className="flex justify-end gap-1 mb-2">
        <button
          type="button"
          onClick={() => setGranularite('jour')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'jour' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Jour
        </button>
        <button
          type="button"
          onClick={() => setGranularite('mois')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'mois' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Mois
        </button>
        <button
          type="button"
          onClick={() => setGranularite('an')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'an' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Année
        </button>
      </div>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="h-44 w-full min-w-[320px]" role="img">
          <polyline points={points} fill="none" stroke="#1770E5" strokeWidth={2.5} />
          {series.map((s, i) => {
            const isFirstOrLastOrMiddle = i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 5) === 0;
            return (
              <g key={s.label}>
                <circle cx={i * pas} cy={y(s.solde)} r={isFirstOrLastOrMiddle ? 3.5 : 2} fill="#1770E5" />
                {isFirstOrLastOrMiddle && (
                  <text x={i * pas} y={y(s.solde) - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={10} fill="#2E2D2D">
                    {formaterDA(s.solde)}
                  </text>
                )}
                {isFirstOrLastOrMiddle && (
                  <text x={i * pas} y={hauteur - 5} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={9} fill="#7C7572" transform={granularite === 'jour' && i !== 0 && i !== series.length - 1 ? `rotate(-45 ${i * pas} ${hauteur - 5})` : undefined}>
                    {formatLabel(s.label, granularite)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
