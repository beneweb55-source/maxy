"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { useConfirmation } from "@/hooks/useConfirmation";
import ConfirmerAction from "@/components/ConfirmerAction";
import EtatVide from "@/components/EtatVide";
import {
  Download,
  FileText,
  ClipboardList,
  FilePen,
  Store,
  Truck,
  Search,
  Calendar,
  Filter,
  X,
  RotateCcw,
  Eye,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

type TypeDocument = "FACTURE_TVA" | "PROFORMA" | "DEVIS";
type OngletType = "tous" | "FACTURE_TVA" | "PROFORMA" | "DEVIS";
type FiltreTypeVente = "TOUTES" | "COMPTOIR" | "YALIDINE";

interface LigneFactureListe {
  id: number;
  numero: string;
  date_emission: string;
  client_nom: string | null;
  total: number;
  total_net: number;
  garantie_fin: string;
  annulee: boolean;
  canal: string | null;
  vendeur: string;
  nb_lignes: number;
  type_document: TypeDocument;
  type_vente?: "COMPTOIR" | "YALIDINE";
  saleType?: "COMPTOIR" | "YALIDINE";
  commande_id?: number | null;
  commande_numero?: string | null;
  premier_article?: string | null;
  nb_autres_articles?: number;
  nb_articles_total?: number;
}

interface StatsCaisses {
  comptoir: { nombre: number; total: number };
  yalidine: { nombre: number; total: number };
  total_global: number;
}

interface ReponseFactures {
  total: number;
  page: number;
  pages: number;
  stats_caisses?: StatsCaisses;
  factures: LigneFactureListe[];
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Badge Type de Document Fiscal */
function BadgeTypeDocument({ type }: { type: TypeDocument }) {
  const config: Record<
    TypeDocument,
    { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    FACTURE_TVA: {
      label: "Facture TVA",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      Icon: FileText,
    },
    PROFORMA: {
      label: "Proforma",
      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      Icon: FilePen,
    },
    DEVIS: {
      label: "Devis",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      Icon: ClipboardList,
    },
  };
  const { label, cls, Icon } = config[type] ?? config.FACTURE_TVA;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/** Badge Type de Vente Interne (Dashboard Admin uniquement) */
function BadgeTypeVente({ type }: { type?: "COMPTOIR" | "YALIDINE" | null }) {
  const estYalidine = type === "YALIDINE";
  if (estYalidine) {
    return (
      <span
        title="Canal interne : Expédition Yalidine"
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
      >
        <Truck className="w-3 h-3" />
        Yalidine
      </span>
    );
  }
  return (
    <span
      title="Canal interne : Vente directe magasin"
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    >
      <Store className="w-3 h-3" />
      Comptoir
    </span>
  );
}

export default function ListeFactures({ role }: { role?: string }) {
  const router = useRouter();
  const { afficher } = useToast();
  const [donnees, setDonnees] = useState<ReponseFactures | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [mois, setMois] = useState("");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [onglet, setOnglet] = useState<OngletType>("tous");
  const [filtreTypeVente, setFiltreTypeVente] = useState<FiltreTypeVente>("TOUTES");
  const { confirmer, propsModal } = useConfirmation();

  // Debounce automatique de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setRecherche(q.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const peutSupprimer = role === "gerant" || role === "dev" || role === "social_media";

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const params = new URLSearchParams();
      if (recherche) params.set("q", recherche);
      if (mois) params.set("mois", mois);
      params.set("page", String(page));
      if (onglet !== "tous") params.set("type", onglet);
      if (filtreTypeVente !== "TOUTES") params.set("type_vente", filtreTypeVente);

      const res = await fetch(`/api/factures?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement des factures.");
      }
      setDonnees((await res.json()) as ReponseFactures);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setChargement(false);
    }
  }, [recherche, mois, page, onglet, filtreTypeVente]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const factures = donnees?.factures ?? [];
  const maintenant = Date.now();
  const estFiltreActif = Boolean(recherche || mois || onglet !== "tous" || filtreTypeVente !== "TOUTES");

  function reinitialiserFiltres() {
    setQ("");
    setRecherche("");
    setMois("");
    setOnglet("tous");
    setFiltreTypeVente("TOUTES");
    setPage(1);
    setSelection(new Set());
  }

  function toggleSelection(id: number) {
    setSelection((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function toggleTout() {
    if (selection.size === factures.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(factures.map((f) => f.id)));
    }
  }

  async function supprimerFacture(id: number, ev?: React.MouseEvent) {
    if (ev) ev.stopPropagation();
    const ok = await confirmer({
      titre: "Supprimer la facture",
      message: "Supprimer cette facture ? Ses ventes associées seront annulées.",
      labelConfirmer: "Supprimer",
      variante: "danger",
    });
    if (!ok) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/factures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      afficher("Facture supprimée.");
      setSelection((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      await charger();
    } catch {
      afficher("Erreur lors de la suppression.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimerSelection() {
    if (selection.size === 0) return;
    const ok = await confirmer({
      titre: `Supprimer ${selection.size} facture(s)`,
      message: `Supprimer ces ${selection.size} factures ? Les ventes associées seront annulées.`,
      labelConfirmer: "Tout supprimer",
      variante: "danger",
    });
    if (!ok) return;
    setEnvoi(true);
    let erreurs = 0;
    for (const id of selection) {
      try {
        const res = await fetch(`/api/factures/${id}`, { method: "DELETE" });
        if (!res.ok) erreurs++;
      } catch {
        erreurs++;
      }
    }
    if (erreurs > 0) {
      afficher(`${erreurs} facture(s) n'ont pas pu être supprimées.`, "erreur");
    } else {
      afficher(`${selection.size} facture(s) supprimée(s).`);
    }
    setSelection(new Set());
    await charger();
    setEnvoi(false);
  }

  function telechargerPdfDirect(f: LigneFactureListe, ev: React.MouseEvent) {
    ev.stopPropagation();
    // Naviguer vers la page détail qui utilise le template partagé unique
    // Le bouton "Télécharger PDF" de la page détail génère le PDF via le même template
    router.push(`/factures/${f.id}`);
  }

  return (
    <div className="space-y-5 animate-entree">
      <ConfirmerAction {...propsModal} />
      {/* ===================== EN-TÊTE ERP ===================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-brand-light-grey dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-brand-black dark:text-white">
                Factures & Documents
              </h1>
              <p className="text-xs text-brand-warm-grey dark:text-brand-warm-grey">
                Gestion et historique commercial — Factures fiscales, proformas et devis
              </p>
            </div>
          </div>
        </div>

        {donnees && (
          <div className="flex items-center gap-2 flex-wrap">
            {donnees.stats_caisses && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-xs">
                  <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Comptoir ({donnees.stats_caisses.comptoir.nombre}) :</span>
                  <span className="font-mono font-black">{formaterDA(donnees.stats_caisses.comptoir.total)}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-xs">
                  <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Yalidine ({donnees.stats_caisses.yalidine.nombre}) :</span>
                  <span className="font-mono font-black">{formaterDA(donnees.stats_caisses.yalidine.total)}</span>
                </div>
              </>
            )}
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-brand-warm-grey border border-brand-light-grey dark:border-white/10">
              <strong className="font-bold text-brand-black dark:text-white">{donnees.total}</strong> facture{donnees.total > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ===================== BARRE D'OUTILS COMPACTE ERP ===================== */}
      <div className="rounded-2xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper p-3 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-warm-grey" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher N°, client, article..."
              className="w-full h-9 pl-9 pr-7 text-xs font-medium rounded-xl border border-brand-light-grey dark:border-white/10 bg-brand-paper dark:bg-white/5 text-brand-black dark:text-white placeholder:text-brand-warm-grey focus:bg-white dark:focus:bg-brand-paper focus:border-brand-orange outline-none transition"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setRecherche("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-warm-grey hover:text-brand-warm-grey dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre Type de Vente (Interne) */}
          <div className="relative">
            <select
              value={filtreTypeVente}
              onChange={(e) => {
                setFiltreTypeVente(e.target.value as FiltreTypeVente);
                setPage(1);
              }}
              className="h-9 text-xs font-bold rounded-xl border border-brand-light-grey dark:border-white/10 bg-brand-paper dark:bg-white/5 px-3 pr-7 text-brand-black dark:text-white focus:border-brand-orange outline-none cursor-pointer"
            >
              <option value="TOUTES">Tous les canaux</option>
              <option value="COMPTOIR">Vente Comptoir</option>
              <option value="YALIDINE">Vente Yalidine</option>
            </select>
          </div>

          {/* Filtre Type de Document */}
          <div className="relative">
            <select
              value={onglet}
              onChange={(e) => {
                setOnglet(e.target.value as OngletType);
                setPage(1);
              }}
              className="h-9 text-xs font-bold rounded-xl border border-brand-light-grey dark:border-white/10 bg-brand-paper dark:bg-white/5 px-3 pr-7 text-brand-black dark:text-white focus:border-brand-orange outline-none cursor-pointer"
            >
              <option value="tous">Tous les documents</option>
              <option value="FACTURE_TVA">Factures TVA</option>
              <option value="PROFORMA">Proformas</option>
              <option value="DEVIS">Devis</option>
            </select>
          </div>

          {/* Filtre Période (Mois) */}
          <div className="relative">
            <input
              type="month"
              value={mois}
              onChange={(e) => {
                setPage(1);
                setMois(e.target.value);
              }}
              className="h-9 text-xs font-semibold rounded-xl border border-brand-light-grey dark:border-white/10 bg-brand-paper dark:bg-white/5 px-3 text-brand-black dark:text-white focus:border-brand-orange outline-none cursor-pointer"
              title="Filtrer par mois"
            />
          </div>

          {/* Action Réinitialiser si filtre actif */}
          {estFiltreActif && (
            <button
              type="button"
              onClick={reinitialiserFiltres}
              className="h-9 px-3 text-xs font-bold text-brand-warm-grey dark:text-brand-warm-grey hover:text-danger rounded-xl border border-dashed border-brand-light-grey dark:border-white/10 hover:border-danger/40 transition flex items-center gap-1.5 cursor-pointer bg-white dark:bg-white/5"
              title="Effacer tous les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        {/* Badges des filtres actifs */}
        {estFiltreActif && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-brand-light-grey dark:border-white/10 text-xs">
            <span className="text-[11px] font-semibold text-brand-warm-grey mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtres actifs :
            </span>

            {recherche && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-brand-warm-grey text-[11px] font-medium border border-brand-light-grey dark:border-white/10">
                Recherche: &quot;{recherche}&quot;
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setRecherche("");
                    setPage(1);
                  }}
                  className="hover:text-danger ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filtreTypeVente !== "TOUTES" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-brand-warm-grey text-[11px] font-medium border border-brand-light-grey dark:border-white/10">
                {filtreTypeVente === "COMPTOIR" ? <Store className="w-3 h-3 text-emerald-600" /> : <Truck className="w-3 h-3 text-blue-600" />}
                Canal: {filtreTypeVente === "COMPTOIR" ? "Comptoir" : "Yalidine"}
                <button
                  type="button"
                  onClick={() => {
                    setFiltreTypeVente("TOUTES");
                    setPage(1);
                  }}
                  className="hover:text-danger ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onglet !== "tous" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-brand-warm-grey text-[11px] font-medium border border-brand-light-grey dark:border-white/10">
                <FileText className="w-3 h-3 text-brand-orange" />
                Document: {onglet === "FACTURE_TVA" ? "Facture TVA" : onglet === "PROFORMA" ? "Proforma" : "Devis"}
                <button
                  type="button"
                  onClick={() => {
                    setOnglet("tous");
                    setPage(1);
                  }}
                  className="hover:text-danger ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {mois && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-brand-warm-grey text-[11px] font-medium border border-brand-light-grey dark:border-white/10">
                <Calendar className="w-3 h-3 text-brand-warm-grey" />
                Mois: {mois}
                <button
                  type="button"
                  onClick={() => {
                    setMois("");
                    setPage(1);
                  }}
                  className="hover:text-danger ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {erreur && (
        <div className="p-4 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-semibold flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      {/* ===================== TABLEAU DES FACTURES ===================== */}
      {chargement && !donnees ? (
        /* Skeleton Table */
        <div className="rounded-2xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-brand-light-grey/30 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : factures.length === 0 ? (
        /* État Vide Professionnel */
        <div className="rounded-2xl border border-dashed border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper/50">
          <EtatVide
            icone={<FileSearch className="w-12 h-12 text-brand-warm-grey/50" />}
            titre="Aucune facture trouvée"
            description={
              estFiltreActif
                ? "Aucun document ne correspond à vos critères de filtrage. Essayez de réinitialiser vos filtres."
                : "Aucune facture enregistrée pour le moment. Chaque vente génère automatiquement sa facture."
            }
            actionLabel={estFiltreActif ? "Réinitialiser les filtres" : "Accéder au point de vente"}
            onAction={estFiltreActif ? reinitialiserFiltres : () => router.push("/pos")}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vue Mobile (Cartes ERP) */}
          <div className="flex flex-col gap-3 md:hidden">
            {peutSupprimer && (
              <div className="flex items-center justify-between rounded-xl bg-brand-paper dark:bg-white/5 px-4 py-2.5 border border-brand-light-grey dark:border-white/10">
                <label className="flex items-center gap-2 text-xs font-bold text-brand-black dark:text-brand-warm-grey cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selection.size > 0 && selection.size === factures.length}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = selection.size > 0 && selection.size < factures.length;
                      }
                    }}
                    onChange={toggleTout}
                    className="h-4 w-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  Tout sélectionner
                </label>
              </div>
            )}

            {factures.map((f) => {
              const estSelectionnee = selection.has(f.id);
              const garantieActive = new Date(f.garantie_fin).getTime() > maintenant;

              return (
                <div
                  key={f.id}
                  onClick={() => router.push(`/factures/${f.id}`)}
                  className={`flex flex-col gap-2.5 rounded-2xl border bg-white dark:bg-brand-paper p-4 shadow-xs transition active:scale-[0.99] cursor-pointer ${
                    estSelectionnee
                      ? "border-brand-orange ring-1 ring-brand-orange"
                      : "border-brand-light-grey dark:border-white/10"
                  } ${f.annulee ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {peutSupprimer && (
                        <input
                          type="checkbox"
                          checked={estSelectionnee}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelection(f.id)}
                          className="h-4 w-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-brand-orange">
                            {f.numero}
                          </span>
                          <BadgeTypeDocument type={f.type_document ?? "FACTURE_TVA"} />
                          <BadgeTypeVente type={f.type_vente} />
                          {f.annulee && (
                            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                              Annulée
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-brand-warm-grey mt-0.5">
                          {dateFr(f.date_emission)}
                          {f.commande_numero && (
                            <span className="ml-1.5 font-mono text-brand-warm-grey dark:text-brand-warm-grey">
                              · Cmd {f.commande_numero}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-black text-brand-black dark:text-white">
                        {formaterDA(f.total_net)}
                      </div>
                      {f.total_net !== f.total && (
                        <div className="text-[10px] text-brand-warm-grey line-through">
                          {formaterDA(f.total)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-brand-warm-grey dark:text-brand-warm-grey flex justify-between items-center pt-2 border-t border-brand-light-grey dark:border-white/10">
                    <div>
                      <span className="font-semibold text-brand-black dark:text-white">
                        {f.client_nom || "Client comptoir"}
                      </span>
                      {f.premier_article && (
                        <p className="text-[11px] text-brand-warm-grey truncate max-w-[220px]">
                          {f.premier_article}
                          {f.nb_autres_articles ? ` (+${f.nb_autres_articles})` : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => telechargerPdfDirect(f, e)}
                        className="p-1.5 rounded-lg text-brand-warm-grey hover:text-brand-orange hover:bg-brand-orange/10 transition"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {peutSupprimer && (
                        <button
                          type="button"
                          onClick={(e) => supprimerFacture(f.id, e)}
                          disabled={envoi}
                          className="p-1.5 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vue Bureau: Tableau Haute Lisibilité ERP */}
          <div className="hidden w-full overflow-x-auto rounded-2xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper shadow-xs md:block">
            <table className="w-full text-xs text-left">
              <thead className="bg-brand-paper dark:bg-white/5 border-b border-brand-light-grey dark:border-white/10 text-[11px] font-bold text-brand-warm-grey uppercase tracking-wider">
                <tr>
                  {peutSupprimer && (
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selection.size > 0 && selection.size === factures.length}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = selection.size > 0 && selection.size < factures.length;
                          }
                        }}
                        onChange={toggleTout}
                        className="h-4 w-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-3.5 py-3">N° Facture</th>
                  <th className="px-3 py-3">Document</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Commande</th>
                  <th className="px-3 py-3">Articles</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Type Vente</th>
                  <th className="px-3.5 py-3 text-right">Total Net</th>
                  <th className="px-3 py-3 text-center">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-grey dark:divide-white/10">
                {factures.map((f) => {
                  const estSelectionnee = selection.has(f.id);

                  return (
                    <tr
                      key={f.id}
                      onClick={() => router.push(`/factures/${f.id}`)}
                      className={`transition-colors cursor-pointer hover:bg-brand-paper/80 dark:hover:bg-white/5 ${
                        f.annulee ? "opacity-60 bg-brand-paper/40" : ""
                      } ${estSelectionnee ? "bg-brand-orange/5" : ""}`}
                    >
                      {peutSupprimer && (
                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={estSelectionnee}
                            onChange={() => toggleSelection(f.id)}
                            className="h-4 w-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange cursor-pointer"
                          />
                        </td>
                      )}

                      {/* N° Facture */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-black text-brand-orange hover:underline">
                          {f.numero}
                        </span>
                      </td>

                      {/* Type Document */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <BadgeTypeDocument type={f.type_document ?? "FACTURE_TVA"} />
                      </td>

                      {/* Client */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-brand-black dark:text-white truncate max-w-[160px]">
                          {f.client_nom || <span className="text-brand-warm-grey font-normal">Client comptoir</span>}
                        </div>
                      </td>

                      {/* Commande associée */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {f.commande_numero ? (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-brand-warm-grey border border-brand-light-grey dark:border-white/10">
                            {f.commande_numero}
                          </span>
                        ) : (
                          <span className="text-brand-warm-grey dark:text-brand-warm-grey">—</span>
                        )}
                      </td>

                      {/* Résumé Articles */}
                      <td className="px-3 py-2.5">
                        {f.premier_article ? (
                          <div
                            className="truncate max-w-[200px] text-brand-warm-grey dark:text-brand-warm-grey font-medium"
                            title={`${f.premier_article}${f.nb_autres_articles ? ` (+${f.nb_autres_articles} article${f.nb_autres_articles > 1 ? "s" : ""})` : ""}`}
                          >
                            <span>{f.premier_article}</span>
                            {f.nb_autres_articles ? (
                              <span className="ml-1 text-[10px] font-bold text-brand-warm-grey">
                                (+{f.nb_autres_articles})
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-brand-warm-grey">{f.nb_lignes} article{f.nb_lignes > 1 ? "s" : ""}</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-brand-warm-grey dark:text-brand-warm-grey">
                        {dateFr(f.date_emission)}
                      </td>

                      {/* Type Vente Interne (Gestion Comptoir / Yalidine) */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <BadgeTypeVente type={f.type_vente} />
                      </td>

                      {/* Total Net */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                        {f.total_net !== f.total && (
                          <span className="block text-[10px] text-brand-warm-grey line-through">
                            {formaterDA(f.total)}
                          </span>
                        )}
                        <span className="font-mono font-black text-brand-black dark:text-white text-xs">
                          {formaterDA(f.total_net)}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        {f.annulee ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-danger/10 text-danger">
                            <XCircle className="w-3 h-3" />
                            Annulée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Valide
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/factures/${f.id}`}
                            className="p-1.5 rounded-lg text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30 dark:hover:bg-white/5 transition"
                            title="Consulter la facture"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => telechargerPdfDirect(f, e)}
                            className="p-1.5 rounded-lg text-brand-warm-grey hover:text-brand-orange hover:bg-brand-orange/10 transition cursor-pointer"
                            title="Télécharger le PDF client"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => window.open(`/factures/${f.id}?print=ticket`, "_blank")}
                            className="p-1.5 rounded-lg text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30 dark:hover:bg-white/5 transition cursor-pointer"
                            title="Imprimer ticket de caisse"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {peutSupprimer && (
                            <button
                              type="button"
                              onClick={(e) => supprimerFacture(f.id, e)}
                              disabled={envoi}
                              className="p-1.5 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition cursor-pointer disabled:opacity-50"
                              title="Supprimer la facture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== PAGINATION MODERNE ===================== */}
      {donnees && donnees.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-brand-warm-grey">
            Affichage de{" "}
            <strong className="font-bold text-brand-black dark:text-white">
              {(donnees.page - 1) * 25 + 1}
            </strong>{" "}
            à{" "}
            <strong className="font-bold text-brand-black dark:text-white">
              {Math.min(donnees.page * 25, donnees.total)}
            </strong>{" "}
            sur{" "}
            <strong className="font-bold text-brand-black dark:text-white">{donnees.total}</strong>{" "}
            factures
          </p>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-white/5 text-brand-black dark:text-white hover:bg-brand-paper disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-brand-light-grey/30 dark:bg-white/5/80 text-brand-black dark:text-brand-warm-grey font-mono text-xs">
              {donnees.page} / {donnees.pages}
            </span>

            <button
              type="button"
              disabled={page >= donnees.pages}
              onClick={() => setPage((n) => n + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-white/5 text-brand-black dark:text-white hover:bg-brand-paper disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
            >
              <span>Suivant</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== BARRE FLOTTANTE SÉLECTION MULTIPLE ===================== */}
      {selection.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-black text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 sm:gap-6 animate-entree z-50 border border-brand-black backdrop-blur-md">
          <span className="font-bold text-xs whitespace-nowrap">
            {selection.size} sélectionné{selection.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selection).join(",");
                window.open(`/factures/impression-masse?ids=${ids}`, "_blank");
              }}
              className="px-3 py-1.5 rounded-xl bg-brand-orange text-white hover:bg-brand-orange/90 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer ({selection.size})</span>
            </button>

            {peutSupprimer && (
              <button
                type="button"
                onClick={() => void supprimerSelection()}
                disabled={envoi}
                className="px-3 py-1.5 rounded-xl bg-danger text-white hover:bg-danger/90 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelection(new Set())}
              disabled={envoi}
              className="text-xs font-bold text-brand-warm-grey hover:text-white transition px-1 cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
