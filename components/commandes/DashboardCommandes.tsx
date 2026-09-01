"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Calendar, 
  Plus, 
  Eye, 
  Printer, 
  Filter, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle,
  RotateCcw,
  Receipt,
  Download,
  Building2,
  User,
  ArrowRight,
  Trash2,
  X,
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { genererFacturePdf } from "@/lib/facture-pdf";

interface LigneCommandeDashboard {
  id: number;
  numero: string;
  date_commande: string;
  statut: string;
  type_paiement: string;
  client_nom: string | null;
  client_tel: string | null;
  total_ht: number;
  total_ttc: number;
  nb_articles: number;
  client?: {
    nom: string;
    telephone: string | null;
  } | null;
  vendeur?: {
    username: string;
  } | null;
}

export default function DashboardCommandes() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { afficher } = useToast();

  const [commandes, setCommandes] = useState<LigneCommandeDashboard[]>([]);
  const [totalCommandes, setTotalCommandes] = useState(0);
  const [page, setPage] = useState(1);
  const [pagesTotales, setPagesTotales] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState(searchParams.get("q") || "");

  // Multi-sélection pour actions de masse
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [envoiMasse, setEnvoiMasse] = useState(false);

  // Modale de confirmation suppression (individuelle ou en masse)
  const [modalSuppression, setModalSuppression] = useState<{
    type: "unique" | "selection";
    id?: number;
    numero?: string;
    nb?: number;
  } | null>(null);

  useEffect(() => {
    if (modalSuppression) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [modalSuppression]);

  // Filtres
  const statutActuel = searchParams.get("statut") || "tous";
  const periodeActuelle = searchParams.get("periode") || "tous";

  const majUrl = useCallback(
    (nouveauxParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(nouveauxParams).forEach(([cle, valeur]) => {
        if (valeur === null || valeur === "" || valeur === "tous") {
          params.delete(cle);
        } else {
          params.set(cle, valeur);
        }
      });
      router.push(`/commandes?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Debounce automatique de la recherche
  useEffect(() => {
    const qUrl = searchParams.get("q") || "";
    if (recherche === qUrl) return;
    const timer = setTimeout(() => {
      majUrl({ q: recherche.trim() || null, page: "1" });
    }, 250);
    return () => clearTimeout(timer);
  }, [recherche, searchParams, majUrl]);

  const chargerCommandes = useCallback(async () => {
    setChargement(true);
    try {
      const query = searchParams.toString();
      const res = await fetch(`/api/commandes?${query}`);
      if (!res.ok) throw new Error("Erreur chargement des commandes.");
      const data = await res.json();
      setCommandes(data.commandes || []);
      setTotalCommandes(data.total || 0);
      setPagesTotales(data.pagesTotales || 1);
    } catch (err: any) {
      afficher(err.message || "Erreur réseau.", "erreur");
    } finally {
      setChargement(false);
    }
  }, [searchParams, afficher]);

  useEffect(() => {
    void chargerCommandes();
  }, [chargerCommandes]);

  // Gestion de la sélection multiple
  const basculerSelection = (id: number) => {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  const selectionnerTout = () => {
    if (selection.size === commandes.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(commandes.map((c) => c.id)));
    }
  };

  const changerStatutRapide = async (id: number, nouveauStatut: string) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      if (!res.ok) throw new Error("Erreur mise à jour");
      afficher(`Statut de la commande mis à jour vers « ${nouveauStatut} ».`, "succes");
      void chargerCommandes();
    } catch (err: any) {
      afficher(err.message || "Erreur action.", "erreur");
    }
  };

  const changerStatutMasse = async (nouveauStatut: string) => {
    if (selection.size === 0) return;
    setEnvoiMasse(true);
    try {
      const res = await fetch("/api/commandes/masse/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selection),
          statut: nouveauStatut,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour en masse");
      const data = await res.json();
      afficher(`${data.modifies} commande(s) mise(s) à jour vers « ${nouveauStatut} ».`, "succes");
      setSelection(new Set());
      void chargerCommandes();
    } catch (err: any) {
      afficher(err.message || "Erreur action.", "erreur");
    } finally {
      setEnvoiMasse(false);
    }
  };

  const executerSuppression = async () => {
    if (!modalSuppression) return;
    setEnvoiMasse(true);

    try {
      if (modalSuppression.type === "unique" && modalSuppression.id) {
        const res = await fetch(`/api/commandes/${modalSuppression.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const corps = await res.json().catch(() => null);
          throw new Error(corps?.error || "Erreur lors de la suppression.");
        }
        afficher(`Commande ${modalSuppression.numero} supprimée et stock réajusté.`, "succes");
      } else if (modalSuppression.type === "selection") {
        const res = await fetch(`/api/commandes/masse/suppression`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selection) }),
        });
        if (!res.ok) {
          const corps = await res.json().catch(() => null);
          throw new Error(corps?.error || "Erreur lors de la suppression en masse.");
        }
        const data = await res.json();
        afficher(`${data.supprimes} commande(s) supprimée(s) et stocks réajustés.`, "succes");
        setSelection(new Set());
      }

      setModalSuppression(null);
      void chargerCommandes();
    } catch (err: any) {
      afficher(err.message || "Erreur lors de la suppression.", "erreur");
    } finally {
      setEnvoiMasse(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header & Bouton Nouvel Encaissement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Commandes & Ventes
            </h1>
            <span className="text-xs font-black text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
              {totalCommandes} enregistrement{totalCommandes > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Historique des ventes comptoir, encaissements POS et devis clients
          </p>
        </div>

        <Link
          href="/commandes/nouveau"
          className="btn btn-primaire h-12 px-6 rounded-2xl font-black text-sm shadow-lg shadow-brand-orange/25 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Commande / POS</span>
        </Link>
      </div>

      {/* Barre de Filtres Rapides (Période & Statut) */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Période */}
        <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
          {[
            { id: "tous", label: "Toutes dates" },
            { id: "aujourdhui", label: "Aujourd'hui" },
            { id: "semaine", label: "7 jours" },
            { id: "mois", label: "Ce mois" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => majUrl({ periode: p.id, page: "1" })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodeActuelle === p.id
                  ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Statut */}
        <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
          {[
            { id: "tous", label: "Tous statuts" },
            { id: "payee", label: "Payées" },
            { id: "en_attente", label: "En attente" },
            { id: "devis", label: "Devis" },
            { id: "annulee", label: "Annulées" },
            { id: "remboursee", label: "Remboursées" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => majUrl({ statut: s.id, page: "1" })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statutActuel === s.id
                  ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Barre de Recherche */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° commande, client, téléphone..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") majUrl({ q: recherche, page: "1" });
            }}
            className="input input-sm h-10 w-full pl-10 pr-4 rounded-xl text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:border-brand-orange"
          />
        </div>

      </div>

      {/* Tableau des Commandes */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={commandes.length > 0 && selection.size === commandes.length}
                    onChange={selectionnerTout}
                    className="checkbox checkbox-xs rounded"
                    title="Tout sélectionner sur cette page"
                  />
                </th>
                <th className="py-3.5 px-4">Commande</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Paiement</th>
                <th className="py-3.5 px-4 text-center">Statut</th>
                <th className="py-3.5 px-4 text-right">Montant TTC</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {chargement ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Aucune commande trouvée pour ces critères.
                  </td>
                </tr>
              ) : (
                commandes.map((cmd) => {
                  const estCoche = selection.has(cmd.id);
                  const dateStr = new Date(cmd.date_commande).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const nomClient = cmd.client?.nom || cmd.client_nom || "Client Comptoir";

                  return (
                    <tr 
                      key={cmd.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        estCoche ? "bg-brand-orange/5 dark:bg-brand-orange/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={estCoche}
                          onChange={() => basculerSelection(cmd.id)}
                          className="checkbox checkbox-xs rounded"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black font-mono text-slate-900 dark:text-white">
                          {cmd.numero}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {cmd.nb_articles} article{cmd.nb_articles > 1 ? "s" : ""}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{nomClient}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold uppercase text-[11px] text-slate-500">
                        {cmd.type_paiement}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={cmd.statut}
                          onChange={(e) => void changerStatutRapide(cmd.id, e.target.value)}
                          className={`select select-xs rounded-xl font-bold text-xs cursor-pointer border shadow-2xs ${
                            cmd.statut === "payee"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : cmd.statut === "en_attente"
                                ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                                : cmd.statut === "devis"
                                  ? "bg-slate-50 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-slate-300"
                                  : cmd.statut === "remboursee"
                                    ? "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300"
                                    : "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          <option value="payee">Payée</option>
                          <option value="en_attente">En attente</option>
                          <option value="devis">Devis</option>
                          <option value="annulee">Annulée</option>
                          <option value="remboursee">Remboursée</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                        {formaterDA(cmd.total_ttc)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/commandes/${cmd.id}`);
                                if (!res.ok) throw new Error();
                                const fullCmd = await res.json();
                                genererFacturePdf({
                                  numero: fullCmd.numero,
                                  date: fullCmd.created_at,
                                  vendeur: fullCmd.vendeur?.username,
                                  type_paiement: fullCmd.type_paiement,
                                  garantie_mois: fullCmd.garantie_mois,
                                  garantie_fin: fullCmd.garantie_fin,
                                  client: {
                                    nom: fullCmd.client?.nom || fullCmd.client_nom,
                                    telephone: fullCmd.client?.telephone || fullCmd.client_tel,
                                    adresse: fullCmd.client?.adresse || fullCmd.client_adresse,
                                    rc: fullCmd.client?.rc,
                                    nif: fullCmd.client?.nif,
                                    nis: fullCmd.client?.nis,
                                    ai: fullCmd.client?.ai,
                                  },
                                  lignes: (fullCmd.lignes || []).map((l: any) => ({
                                    code_interne: l.code_interne,
                                    designation: l.designation,
                                    numero_serie: l.numero_serie,
                                    quantite: l.quantite,
                                    prix_unitaire: l.prix_unitaire,
                                    total_ligne: l.total_ligne,
                                  })),
                                  total_ht: fullCmd.total_ht,
                                  remise_globale: fullCmd.remise_globale,
                                  total_ttc: fullCmd.total_ttc,
                                  notes: fullCmd.notes,
                                });
                                afficher("Téléchargement de la facture PDF lancé.", "succes");
                              } catch {
                                afficher("Erreur lors de la génération du PDF.", "erreur");
                              }
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 transition"
                            title="Télécharger la Facture (PDF)"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/commandes/${cmd.id}`}
                            className="inline-flex items-center gap-1 btn btn-secondaire text-xs py-1.5 px-2.5 rounded-xl font-bold hover:text-brand-orange shadow-xs"
                            title="Voir la commande"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Détails</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setModalSuppression({ type: "unique", id: cmd.id, numero: cmd.numero })}
                            className="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Supprimer la commande"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BARRE D'ACTION FLOTTANTE POUR SÉLECTION MULTIPLE ================= */}
      {selection.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-5 sm:px-6 py-3.5 rounded-full shadow-2xl flex flex-wrap items-center justify-center gap-3 sm:gap-5 animate-entree z-50 border border-white/10 backdrop-blur-md">
          <span className="font-bold text-xs sm:text-sm whitespace-nowrap">
            {selection.size} commande(s) sélectionnée(s)
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const ids = Array.from(selection).join(",");
                window.open(`/commandes/impression-masse?ids=${ids}`, "_blank");
              }}
              className="btn bg-brand-orange text-white hover:bg-brand-orange/90 border-0 shadow-lg shadow-brand-orange/20 text-xs font-bold gap-1.5 h-9 rounded-xl"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer Factures ({selection.size})</span>
            </button>

            {/* Sélecteur de statut de masse */}
            <select
              disabled={envoiMasse}
              onChange={(e) => {
                if (e.target.value) {
                  void changerStatutMasse(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="select select-sm h-9 bg-slate-800 text-white border-slate-700 text-xs font-bold rounded-xl"
            >
              <option value="" disabled>Changer statut...</option>
              <option value="payee">Passer en Payée</option>
              <option value="en_attente">Passer en En attente</option>
              <option value="devis">Passer en Devis</option>
              <option value="annulee">Passer en Annulée</option>
              <option value="remboursee">Passer en Remboursée</option>
            </select>

            <button
              type="button"
              disabled={envoiMasse}
              onClick={() => setModalSuppression({ type: "selection", nb: selection.size })}
              className="btn bg-red-600/80 hover:bg-red-600 text-white border-0 text-xs font-bold gap-1.5 h-9 rounded-xl px-3"
              title="Supprimer les commandes sélectionnées"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer ({selection.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelection(new Set())}
              disabled={envoiMasse}
              className="text-xs font-bold text-slate-400 hover:text-white transition px-2"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALE DE CONFIRMATION DE SUPPRESSION ================= */}
      {modalSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-entree">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {modalSuppression.type === "unique"
                  ? `Supprimer la commande ${modalSuppression.numero}`
                  : `Supprimer ${modalSuppression.nb} commandes`}
              </h3>
              <button
                onClick={() => setModalSuppression(null)}
                className="h-9 w-9 flex items-center justify-center rounded-xl p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                {modalSuppression.type === "unique"
                  ? `Êtes-vous certain de vouloir supprimer la commande ${modalSuppression.numero} ?`
                  : `Êtes-vous certain de vouloir supprimer les ${modalSuppression.nb} commandes sélectionnées ?`}
              </p>
              <p className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/40">
                ⚠️ Les exemplaires physiques associés seront automatiquement remis en stock (statut &quot;En vente&quot;).
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalSuppression(null)}
                className="btn btn-secondaire flex-1 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoiMasse}
                onClick={executerSuppression}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1 text-xs font-bold"
              >
                {envoiMasse ? "Suppression..." : "Confirmer la Suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
