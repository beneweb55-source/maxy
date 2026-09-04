"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Plus, 
  Eye, 
  Trash2, 
  X,
  Truck,
  Store,
  Tag,
  Phone,
  Share2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Layers,
  ArrowUpDown
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import ModaleCreationCommande from "./ModaleCreationCommande";
import type { CanalVente, StatutCommande, CaisseDestination } from "@prisma/client";

interface LigneCommandeDashboard {
  id: number;
  numero: string;
  date_commande: string;
  canal: CanalVente;
  statut: StatutCommande;
  caisse: CaisseDestination;
  type_paiement: string;
  payee: boolean;
  client_nom: string | null;
  client_tel: string | null;
  wilaya: string | null;
  commune: string | null;
  frais_livraison: number;
  total_ht: number;
  total_ttc: number;
  lignes: any[];
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

  // Modale de création de commande
  const [modaleOuverte, setModaleOuverte] = useState(false);

  // Multi-sélection pour actions de masse
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [envoiMasse, setEnvoiMasse] = useState(false);

  // Modale de confirmation suppression
  const [modalSuppression, setModalSuppression] = useState<{
    type: "unique" | "selection";
    id?: number;
    numero?: string;
    nb?: number;
  } | null>(null);

  // Onglet actif déduit de l'URL
  const statutActuel = searchParams.get("statut") || "tous";
  const canalActuel = searchParams.get("canal") || "tous";
  const ongletActuel = 
    canalActuel === "YALIDINE" 
      ? "yalidine" 
      : canalActuel === "COMPTOIR"
        ? "comptoir"
        : statutActuel === "EN_ATTENTE"
          ? "attente"
          : statutActuel === "TERMINEE"
            ? "terminees"
            : "toutes";

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
      setTotalCommandes(data.pagination?.total ?? (data.commandes?.length || 0));
      setPagesTotales(data.pagination?.totalPages || 1);
    } catch (err: any) {
      afficher(err.message || "Erreur réseau.", "erreur");
    } finally {
      setChargement(false);
    }
  }, [searchParams, afficher]);

  useEffect(() => {
    void chargerCommandes();
  }, [chargerCommandes]);

  // Changement d'onglet rapide (Tabs OMS)
  const changerOnglet = (onglet: string) => {
    if (onglet === "toutes") {
      majUrl({ statut: null, canal: null, page: "1" });
    } else if (onglet === "attente") {
      majUrl({ statut: "EN_ATTENTE", canal: null, page: "1" });
    } else if (onglet === "yalidine") {
      majUrl({ canal: "YALIDINE", statut: null, page: "1" });
    } else if (onglet === "comptoir") {
      majUrl({ canal: "COMPTOIR", statut: null, page: "1" });
    } else if (onglet === "terminees") {
      majUrl({ statut: "TERMINEE", canal: null, page: "1" });
    }
  };

  const changerStatutRapide = async (id: number, nouveauStatut: StatutCommande) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || d.error || "Erreur lors de la transition de statut.");
      }
      afficher(
        `Statut de la commande mis à jour vers « ${nouveauStatut} ». Stocks et caisses synchronisés.`,
        "succes"
      );
      void chargerCommandes();
    } catch (err: any) {
      afficher(err.message || "Erreur action.", "erreur");
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
        afficher(
          `Commande ${modalSuppression.numero} supprimée et stocks réajustés.`,
          "succes"
        );
      } else if (modalSuppression.type === "selection") {
        const ids = Array.from(selection);
        const res = await fetch("/api/commandes/masse/suppression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) {
          const corps = await res.json().catch(() => null);
          throw new Error(corps?.error || "Erreur lors de la suppression en masse.");
        }
        const data = await res.json();
        setSelection(new Set());
        afficher(`${data.supprimes} commande(s) supprimée(s) et stocks réajustés.`, "succes");
      }

      setModalSuppression(null);
      void chargerCommandes();
    } catch (err: any) {
      afficher(err.message || "Erreur lors de la suppression.", "erreur");
    } finally {
      setEnvoiMasse(false);
    }
  };

  // Badge stylisé selon le canal de vente
  const renderBadgeCanal = (c: CanalVente) => {
    const config: Record<CanalVente, { label: string; icon: any; cls: string }> = {
      COMPTOIR: {
        label: "Comptoir",
        icon: Store,
        cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
      },
      YALIDINE: {
        label: "Yalidine",
        icon: Truck,
        cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
      },
      OUEDKNISS: {
        label: "Ouedkniss",
        icon: Tag,
        cls: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      },
      TELEPHONE: {
        label: "Téléphone",
        icon: Phone,
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      },
      FACEBOOK: {
        label: "Facebook",
        icon: Share2,
        cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
      },
    };

    const item = config[c] || config.COMPTOIR;
    const Icon = item.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black ${item.cls}`}>
        <Icon className="w-3 h-3" />
        {item.label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Bouton Nouvelle Commande */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-black dark:text-white">
              Gestion des Commandes (OMS)
            </h1>
            <span className="text-xs font-black text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
              {totalCommandes} commande{totalCommandes > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-brand-warm-grey font-medium mt-1">
            Dispatching omnicanal, réservation automatique du stock et caisses étanches
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModaleOuverte(true)}
          className="btn btn-primaire h-11 px-5 rounded-xl font-bold text-sm shadow-md shadow-brand-orange/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Commande</span>
        </button>
      </div>

      {/* Onglets rapides (Tabs) : Toutes | En Attente | Expéditions Yalidine | Comptoir | Terminées */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
          {[
            { id: "toutes", label: "Toutes" },
            { id: "attente", label: "En Attente" },
            { id: "yalidine", label: "Expéditions Yalidine (En cours)" },
            { id: "comptoir", label: "Comptoir" },
            { id: "terminees", label: "Terminées" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => changerOnglet(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ongletActuel === tab.id
                  ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Barre de Recherche */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° commande, client, téléphone, wilaya..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:outline-none focus:border-brand-orange"
          />
        </div>
      </div>

      {/* Barre d'actions de masse */}
      {selection.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-xs font-bold">
          <span className="text-brand-orange">{selection.size} sélectionnée(s)</span>
          <button
            type="button"
            onClick={() => setModalSuppression({ type: "selection", numero: `${selection.size} commande(s)` })}
            className="px-3 py-1.5 rounded-lg bg-danger text-white hover:bg-danger/90 text-xs"
          >
            🗑 Supprimer la sélection
          </button>
          <button
            type="button"
            onClick={() => setSelection(new Set())}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
          >
            Désélectionner
          </button>
        </div>
      )}

      {/* Tableau des Commandes */}
      <div className="bg-white dark:bg-brand-paper rounded-2xl border border-brand-light-grey/80 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/20 dark:bg-black/20 text-brand-warm-grey font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-2 text-center w-10">
                  <input
                    type="checkbox"
                    checked={commandes.length > 0 && commandes.every(cmd => selection.has(cmd.id))}
                    onChange={() => {
                      if (commandes.every(cmd => selection.has(cmd.id))) {
                        setSelection(new Set());
                      } else {
                        setSelection(new Set(commandes.map(cmd => cmd.id)));
                      }
                    }}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                </th>
                <th className="py-3 px-4">Réf</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client & Destination</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4 text-center">Statut (OMS)</th>
                <th className="py-3 px-4 text-right">Total TTC</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-light-grey/40 dark:divide-white/5">
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
                      className="hover:bg-brand-light-grey/20 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={selection.has(cmd.id)}
                          onChange={() => {
                            const next = new Set(selection);
                            if (next.has(cmd.id)) next.delete(cmd.id);
                            else next.add(cmd.id);
                            setSelection(next);
                          }}
                          className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-xs text-brand-black dark:text-white">
                          {cmd.numero}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {cmd.lignes?.length || 0} article{(cmd.lignes?.length || 0) > 1 ? "s" : ""}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-brand-black dark:text-white">
                        <div>{nomClient}</div>
                        {cmd.wilaya ? (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{cmd.wilaya}{cmd.commune ? ` · ${cmd.commune}` : ""}</span>
                          </div>
                        ) : cmd.client_tel ? (
                          <div className="text-[10px] text-brand-warm-grey">{cmd.client_tel}</div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderBadgeCanal(cmd.canal)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={cmd.statut}
                          onChange={(e) => void changerStatutRapide(cmd.id, e.target.value as StatutCommande)}
                          className={`rounded-lg font-bold text-[11px] px-2.5 py-1 cursor-pointer border shadow-2xs ${
                            cmd.statut === "TERMINEE"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : cmd.statut === "EN_LIVRAISON"
                                ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300"
                                : cmd.statut === "CONFIRMEE"
                                  ? "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300"
                                  : cmd.statut === "EN_ATTENTE"
                                    ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          <option value="EN_ATTENTE">En attente</option>
                          <option value="CONFIRMEE">Confirmée</option>
                          <option value="EN_LIVRAISON">En livraison</option>
                          <option value="TERMINEE">Terminée</option>
                          <option value="ANNULEE">Annulée</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-brand-black dark:text-white">
                        <div>{formaterDA(cmd.total_ttc)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {cmd.caisse === "CAISSE_YALIDINE" ? "Caisse Yalidine" : "Caisse Magasin"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => router.push(`/commandes/${cmd.id}`)}
                            className="p-1.5 rounded-lg border border-brand-light-grey text-slate-600 hover:text-brand-orange hover:border-brand-orange transition"
                            title="Voir détail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalSuppression({ type: "unique", id: cmd.id, numero: cmd.numero })}
                            className="p-1.5 rounded-lg border border-brand-light-grey text-slate-400 hover:text-danger hover:border-danger transition"
                            title="Supprimer la commande"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modale de création de commande */}
      <ModaleCreationCommande
        ouvert={modaleOuverte}
        onFermer={() => setModaleOuverte(false)}
        onSucces={() => void chargerCommandes()}
      />

      {/* Modale confirmation suppression */}
      {modalSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold">Confirmer la suppression</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {modalSuppression.type === "unique" ? (
                <>Êtes-vous sûr de vouloir supprimer la commande <strong>{modalSuppression.numero}</strong> ?</>
              ) : (
                <>Êtes-vous sûr de vouloir supprimer les <strong>{selection.size} commande(s) sélectionnée(s)</strong> ?</>
              )}
              {" "}Les articles réservés seront automatiquement remis en stock disponible.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalSuppression(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerSuppression}
                disabled={envoiMasse}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-danger text-white hover:bg-danger/90"
              >
                {envoiMasse ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
