"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import {
  IconeBouclier,
  IconeChevronGauche,
  IconeChevronDroite,
  IconeRecherche,
  IconeCorbeille,
  IconeImprimante,
} from "@/components/icons";
import { useToast } from "@/components/toast";
import { Download, FileText, ClipboardList, FilePen, Store, Truck } from "lucide-react";
import { genererFacturePdf } from "@/lib/facture-pdf";

type TypeDocument = "FACTURE_TVA" | "PROFORMA" | "DEVIS";

/** Onglets de filtrage par type de document */
type OngletType = "tous" | "FACTURE_TVA" | "PROFORMA" | "DEVIS";

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

interface ReponseFactures {
  total: number;
  page: number;
  pages: number;
  factures: LigneFactureListe[];
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

/** Badge coloré selon le type de document */
function BadgeTypeDocument({ type }: { type: TypeDocument }) {
  const config: Record<TypeDocument, { label: string; cls: string; Icon: React.ComponentType<{className?: string}> }> = {
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
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/** Badge Comptoir / Yalidine */
function BadgeTypeVente({ type }: { type?: "COMPTOIR" | "YALIDINE" | null }) {
  const estYalidine = type === "YALIDINE";
  if (estYalidine) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
        <Truck className="w-3 h-3" />
        Yalidine
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
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
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [mois, setMois] = useState("");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [envoi, setEnvoi] = useState(false);
  const [onglet, setOnglet] = useState<OngletType>("tous");
  const [filtreTypeVente, setFiltreTypeVente] = useState<"TOUTES" | "COMPTOIR" | "YALIDINE">("TOUTES");

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
    setErreur(null);
    try {
      const params = new URLSearchParams();
      if (recherche) params.set("q", recherche);
      if (mois) params.set("mois", mois);
      params.set("page", String(page));
      // Filtre par type de document selon l'onglet actif
      if (onglet !== "tous") params.set("type", onglet);
      // Filtre par type de vente (COMPTOIR ou YALIDINE)
      if (filtreTypeVente !== "TOUTES") params.set("type_vente", filtreTypeVente);
      const res = await fetch(`/api/factures?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement des factures.");
      }
      setDonnees((await res.json()) as ReponseFactures);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, [recherche, mois, page, onglet, filtreTypeVente]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const factures = donnees?.factures ?? [];
  const maintenant = Date.now();

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
    if (!window.confirm("Supprimer cette facture ? Ses ventes associées seront annulées.")) return;
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
    if (!window.confirm(`Supprimer ces ${selection.size} factures ? Les ventes seront annulées.`)) return;
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

  // Configuration des onglets
  const onglets: { id: OngletType; label: string; Icon: React.ComponentType<{className?: string}> }[] = [
    { id: "tous", label: "Tous", Icon: FileText },
    { id: "FACTURE_TVA", label: "Factures TVA", Icon: FileText },
    { id: "PROFORMA", label: "Proformas", Icon: FilePen },
    { id: "DEVIS", label: "Devis", Icon: ClipboardList },
  ];

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-black dark:text-white">Documents</h1>
          <p className="mt-1 text-sm text-brand-warm-grey">
            Factures TVA, proformas et devis — générés à chaque vente avec 6 mois de garantie.
          </p>
        </div>
      </div>

      {/* Filtres Documents et Types de Vente */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Onglets de filtrage par type de document */}
        <div className="flex gap-1 p-1 rounded-2xl bg-brand-light-grey/30 dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/10 w-full sm:w-auto overflow-x-auto">
          {onglets.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setOnglet(id); setPage(1); setSelection(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 justify-center cursor-pointer ${
                onglet === id
                  ? "bg-white dark:bg-brand-paper text-brand-orange shadow-sm"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Filtres Type de Vente : Comptoir vs Yalidine */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setFiltreTypeVente("TOUTES"); setPage(1); setSelection(new Set()); }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filtreTypeVente === "TOUTES"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-black"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Toutes les ventes
          </button>
          <button
            type="button"
            onClick={() => { setFiltreTypeVente("COMPTOIR"); setPage(1); setSelection(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filtreTypeVente === "COMPTOIR"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "text-slate-500 hover:text-emerald-600"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Ventes Comptoir
          </button>
          <button
            type="button"
            onClick={() => { setFiltreTypeVente("YALIDINE"); setPage(1); setSelection(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filtreTypeVente === "YALIDINE"
                ? "bg-blue-600 text-white shadow-xs font-black"
                : "text-slate-500 hover:text-blue-600"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Ventes Yalidine
          </button>
        </div>
      </div>

      <div className="carte flex flex-wrap items-center gap-3">
        <form
          className="relative min-w-56 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setRecherche(q.trim());
          }}
        >
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey">
            <IconeRecherche taille={15} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° document, client, produit..."
            className="champ pl-9"
          />
        </form>
        <input
          type="month"
          value={mois}
          onChange={(e) => {
            setPage(1);
            setMois(e.target.value);
          }}
          className="champ w-auto"
        />
        {(recherche || mois) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setRecherche("");
              setMois("");
              setPage(1);
            }}
            className="text-sm text-brand-warm-grey hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}
      {!erreur && donnees === null && (
        <p className="text-sm text-brand-warm-grey">Chargement des documents…</p>
      )}

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black dark:text-white">{donnees.total}</strong>{" "}
          {onglet === "DEVIS" ? "devis" : onglet === "PROFORMA" ? "proforma(s)" : `facture${donnees.total > 1 ? "s" : ""}`}
        </p>
      )}

      {donnees && factures.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <p className="font-semibold text-brand-black dark:text-white">Aucun document.</p>
          <p className="mt-1">
            {onglet === "DEVIS"
              ? "Aucun devis créé pour le moment."
              : onglet === "PROFORMA"
              ? "Aucune proforma créée pour le moment."
              : "Chaque vente enregistrée génère automatiquement sa facture."}
          </p>
          {onglet === "tous" && (
            <Link href="/vitrine" className="btn btn-primaire mt-4">
              Vendre depuis la vitrine
            </Link>
          )}
        </div>
      )}

      {factures.length > 0 && (
        <div className="space-y-4">
          {/* Vue Mobile: Cartes */}
          <div className="flex flex-col gap-3 md:hidden">
            {peutSupprimer && (
              <div className="flex items-center justify-between rounded-lg bg-brand-light-grey/25 px-4 py-3 border border-brand-light-grey">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selection.size > 0 && selection.size === factures.length}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = selection.size > 0 && selection.size < factures.length;
                      }
                    }}
                    onChange={toggleTout}
                    className="h-4 w-4 rounded border-brand-grey text-brand-orange focus:ring-brand-orange"
                  />
                  Tout sélectionner
                </label>
              </div>
            )}
            
            {factures.map((f) => {
              const garantieActive = new Date(f.garantie_fin).getTime() > maintenant;
              const estSelectionnee = selection.has(f.id);

              return (
                <div
                  key={f.id}
                  onClick={() => router.push(`/factures/${f.id}`)}
                  className={`relative flex flex-col gap-2 rounded-xl border bg-brand-white p-4 shadow-sm transition active:scale-[0.99] cursor-pointer ${
                    estSelectionnee ? "border-brand-orange ring-1 ring-brand-orange" : "border-brand-light-grey"
                  } ${f.annulee ? "opacity-75" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {peutSupprimer && (
                        <input
                          type="checkbox"
                          checked={estSelectionnee}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelection(f.id)}
                          className="h-5 w-5 rounded border-brand-grey text-brand-orange focus:ring-brand-orange cursor-pointer"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-sm font-bold text-brand-orange">{f.numero}</span>
                          <BadgeTypeDocument type={f.type_document ?? "FACTURE_TVA"} />
                          <BadgeTypeVente type={f.type_vente} />
                          {f.annulee && (
                            <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger uppercase">
                              Annulée
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-warm-grey mt-0.5">
                          <span>{dateFr(f.date_emission)}</span>
                          {f.commande_numero && (
                            <span>· <strong className="font-mono text-slate-700 dark:text-slate-300">{f.commande_numero}</strong></span>
                          )}
                        </div>
                        {f.premier_article && (
                          <div
                            className="text-xs text-slate-500 truncate max-w-[260px] whitespace-nowrap mt-0.5"
                            title={`${f.premier_article}${f.nb_autres_articles ? ` (+${f.nb_autres_articles} article${f.nb_autres_articles > 1 ? "s" : ""})` : ""}`}
                          >
                            {f.premier_article}
                            {f.nb_autres_articles ? ` (+${f.nb_autres_articles} article${f.nb_autres_articles > 1 ? "s" : ""})` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {f.total_net !== f.total && (
                        <div className="text-[10px] text-brand-grey line-through">{formaterDA(f.total)}</div>
                      )}
                      <div className="font-bold text-brand-black">{formaterDA(f.total_net)}</div>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-brand-warm-grey">Client :</span>
                      <span className="font-semibold text-brand-black text-right">
                        {f.client_nom || <span className="text-brand-grey font-normal">Comptoir</span>}
                        {f.canal && <span className="ml-1 text-xs text-brand-grey">({f.canal})</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-warm-grey">Garantie :</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          garantieActive
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-brand-light-grey/60 text-brand-warm-grey"
                        }`}
                      >
                        <IconeBouclier taille={10} />
                        {garantieActive ? `→ ${dateFr(f.garantie_fin)}` : "expirée"}
                      </span>
                    </div>
                  </div>

                  {peutSupprimer && (
                    <div className="mt-2 border-t border-brand-light-grey/50 pt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => supprimerFacture(f.id, e)}
                        disabled={envoi}
                        className="flex items-center gap-1 rounded-md bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
                      >
                        <IconeCorbeille taille={14} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vue Bureau: Tableau */}
          <div className="hidden w-full overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white dark:bg-brand-paper dark:border-white/10 md:block">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-brand-light-grey/25 dark:bg-black/30">
                <tr>
                  {peutSupprimer && (
                    <th className="entete-table w-10 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selection.size > 0 && selection.size === factures.length}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = selection.size > 0 && selection.size < factures.length;
                          }
                        }}
                        onChange={toggleTout}
                        className="h-4 w-4 rounded border-brand-grey text-brand-orange focus:ring-brand-orange cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="entete-table">N°</th>
                  <th className="entete-table">Type</th>
                  <th className="entete-table">Commande</th>
                  <th className="entete-table">Date</th>
                  <th className="entete-table">Client</th>
                  <th className="entete-table text-right">Articles</th>
                  <th className="entete-table">Garantie</th>
                  <th className="entete-table">Vendeur</th>
                  <th className="entete-table text-right">Total</th>
                  {peutSupprimer && <th className="entete-table text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {factures.map((f) => {
                  const garantieActive = new Date(f.garantie_fin).getTime() > maintenant;
                  const estSelectionnee = selection.has(f.id);

                  return (
                    <tr
                      key={f.id}
                      onClick={() => router.push(`/factures/${f.id}`)}
                      className={`ligne-table border-b border-brand-light-grey/30 dark:border-white/5 last:border-0 cursor-pointer ${
                        f.annulee ? "text-brand-grey" : ""
                      } ${estSelectionnee ? "bg-brand-orange/5" : ""}`}
                    >
                      {peutSupprimer && (
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={estSelectionnee}
                            onChange={() => toggleSelection(f.id)}
                            className="h-4 w-4 rounded border-brand-grey text-brand-orange focus:ring-brand-orange cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-3 py-3 font-mono text-xs font-bold text-brand-orange">
                        {f.numero}
                        {f.annulee && (
                          <span className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-[10px] font-semibold text-danger">
                            annulée
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <BadgeTypeDocument type={f.type_document ?? "FACTURE_TVA"} />
                          <BadgeTypeVente type={f.type_vente} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-xs font-bold text-brand-black dark:text-white">
                          {f.commande_numero || "—"}
                        </div>
                        {f.premier_article && (
                          <div
                            className="text-xs text-slate-500 truncate max-w-[200px] whitespace-nowrap"
                            title={`${f.premier_article}${f.nb_autres_articles ? ` (+${f.nb_autres_articles} article${f.nb_autres_articles > 1 ? "s" : ""})` : ""}`}
                          >
                            {f.premier_article}
                            {f.nb_autres_articles ? ` (+${f.nb_autres_articles} article${f.nb_autres_articles > 1 ? "s" : ""})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">{dateFr(f.date_emission)}</td>
                      <td className="px-3 py-3">
                        {f.client_nom || <span className="text-brand-grey">Client comptoir</span>}
                        {f.canal && (
                          <span className="block text-xs text-brand-grey">{f.canal}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{f.nb_lignes}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            garantieActive
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-brand-light-grey/60 text-brand-warm-grey"
                          }`}
                          title={`Garantie jusqu'au ${dateFr(f.garantie_fin)}`}
                        >
                          <IconeBouclier taille={11} />
                          {garantieActive ? `→ ${dateFr(f.garantie_fin)}` : "expirée"}
                        </span>
                      </td>
                      <td className="px-3 py-3">{f.vendeur}</td>
                      <td className="px-3 py-3 text-right">
                        {f.total_net !== f.total && (
                          <span className="block text-[10px] text-brand-grey line-through">
                            {formaterDA(f.total)}
                          </span>
                        )}
                        <span className="font-bold">{formaterDA(f.total_net)}</span>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/factures/${f.id}`);
                                if (!res.ok) throw new Error();
                                const fullFacture = await res.json();
                                genererFacturePdf({
                                  numero: fullFacture.numero,
                                  date: fullFacture.date_emission,
                                  vendeur: fullFacture.vendeur,
                                  type_paiement: fullFacture.mode_paiement,
                                  garantie_mois: 6,
                                  client: {
                                    nom: fullFacture.client_nom,
                                    telephone: fullFacture.client_tel,
                                    adresse: fullFacture.client_adresse,
                                    rc: fullFacture.client_rc,
                                    nif: fullFacture.client_nif,
                                    nis: fullFacture.client_nis,
                                    ai: fullFacture.client_ai,
                                  },
                                  lignes: (fullFacture.lignes || []).map((l: any) => ({
                                    code_interne: l.code_interne,
                                    designation: l.designation,
                                    quantite: 1,
                                    prix_unitaire: l.prix,
                                    total_ligne: l.prix,
                                  })),
                                  total_ttc: fullFacture.total,
                                });
                                afficher("Téléchargement du PDF lancé.", "succes");
                              } catch {
                                afficher("Erreur génération PDF.", "erreur");
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-orange/10 hover:text-brand-orange"
                            title="Télécharger le PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {peutSupprimer && (
                            <button
                              type="button"
                              onClick={(e) => supprimerFacture(f.id, e)}
                              disabled={envoi}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                              title="Supprimer la facture"
                            >
                              <IconeCorbeille taille={15} />
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

      {donnees && donnees.pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((n) => Math.max(1, n - 1))}
            className="btn btn-secondaire"
          >
            <IconeChevronGauche taille={15} />
            Précédent
          </button>
          <span className="px-2 text-brand-warm-grey">
            Page {donnees.page} / {donnees.pages}
          </span>
          <button
            type="button"
            disabled={page >= donnees.pages}
            onClick={() => setPage((n) => n + 1)}
            className="btn btn-secondaire"
          >
            Suivant
            <IconeChevronDroite taille={15} />
          </button>
        </div>
      )}

      {/* Barre d'action globale pour la sélection multiple */}
      {selection.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-black text-brand-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 sm:gap-6 animate-entree z-50 border border-white/10 backdrop-blur-md">
          <span className="font-bold text-xs sm:text-sm whitespace-nowrap">
            {selection.size} document(s) sélectionné(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selection).join(",");
                window.open(`/factures/impression-masse?ids=${ids}`, "_blank");
              }}
              className="btn bg-brand-orange text-white hover:bg-brand-orange/90 border-0 shadow-lg shadow-brand-orange/20 text-xs font-bold gap-1.5"
            >
              <IconeImprimante taille={15} />
              <span>Imprimer le lot ({selection.size})</span>
            </button>

            {peutSupprimer && (
              <button
                type="button"
                onClick={() => void supprimerSelection()}
                disabled={envoi}
                className="btn bg-danger text-white hover:bg-danger/90 border-0 shadow-lg shadow-danger/20 disabled:opacity-50 text-xs font-bold gap-1.5"
              >
                <IconeCorbeille taille={15} />
                <span>Supprimer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelection(new Set())}
              disabled={envoi}
              className="text-xs font-bold text-brand-grey hover:text-white transition px-2"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
