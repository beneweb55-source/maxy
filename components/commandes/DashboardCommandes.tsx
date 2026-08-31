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
  ArrowRight
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";

interface LigneCommandeDashboard {
  id: number;
  numero: string;
  date_commande: string;
  statut: "payee" | "en_attente" | "devis" | "annulee" | "remboursee";
  type_paiement: "especes" | "virement" | "carte" | "cheque";
  total_ttc: number;
  client_nom?: string;
  client?: { nom: string };
  vendeur?: { username: string };
  lignes?: any[];
}

export default function DashboardCommandes() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { afficher } = useToast();

  const [commandes, setCommandes] = useState<LigneCommandeDashboard[]>([]);
  const [chargement, setChargement] = useState(true);
  const [totalCommandes, setTotalCommandes] = useState(0);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [envoiMasse, setEnvoiMasse] = useState(false);

  // Filtres URL
  const statutActuel = searchParams.get("statut") || "tous";
  const periodeActuelle = searchParams.get("periode") || "tous";
  const qActuel = searchParams.get("q") || "";
  const pageActuelle = Number(searchParams.get("page")) || 1;

  const [rechercheLocale, setRechercheLocale] = useState(qActuel);

  const majUrl = useCallback(
    (modifs: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(modifs).forEach(([k, v]) => {
        if (v === null || v === "" || v === "tous") params.delete(k);
        else params.set(k, v);
      });
      router.push(`/commandes?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Charger les commandes
  const chargerCommandes = useCallback(async () => {
    setChargement(true);
    try {
      const params = new URLSearchParams();
      if (statutActuel !== "tous") params.set("statut", statutActuel);
      if (periodeActuelle !== "tous") params.set("periode", periodeActuelle);
      if (qActuel) params.set("q", qActuel);
      params.set("page", String(pageActuelle));

      const res = await fetch(`/api/commandes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCommandes(data.commandes || []);
        setTotalCommandes(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Erreur chargement commandes:", err);
    } finally {
      setChargement(false);
    }
  }, [statutActuel, periodeActuelle, qActuel, pageActuelle]);

  useEffect(() => {
    chargerCommandes();
  }, [chargerCommandes]);

  const toggleSelection = (id: number) => {
    setSelection((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleTout = () => {
    if (selection.size === commandes.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(commandes.map((c) => c.id)));
    }
  };

  const changerStatutRapide = async (commandeId: number, nouveauStatut: string) => {
    try {
      const res = await fetch(`/api/commandes/${commandeId}`, {
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
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Statuts */}
        <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
          {[
            { id: "tous", label: "Tous statuts" },
            { id: "payee", label: "Payées" },
            { id: "en_attente", label: "Impayées / En attente" },
            { id: "devis", label: "Devis" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => majUrl({ statut: st.id, page: "1" })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statutActuel === st.id
                  ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

      </div>

      {/* Barre de Recherche */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={rechercheLocale}
          onChange={(e) => {
            setRechercheLocale(e.target.value);
            majUrl({ q: e.target.value || null, page: "1" });
          }}
          placeholder="Rechercher par N° de commande, client, modèle ou numéro de série..."
          className="w-full h-12 min-h-[48px] pl-12 pr-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-base font-bold text-slate-900 dark:text-white shadow-xs focus:border-brand-orange"
        />
      </div>

      {/* Data Table des Commandes */}
      <div className="border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-zinc-900">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-800 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                <th className="py-4 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selection.size > 0 && selection.size === commandes.length}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = selection.size > 0 && selection.size < commandes.length;
                      }
                    }}
                    onChange={toggleTout}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-brand-orange focus:ring-brand-orange cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">N° Commande</th>
                <th className="py-4 px-4">Date & Heure</th>
                <th className="py-4 px-4">Client</th>
                <th className="py-4 px-4">Règlement</th>
                <th className="py-4 px-4 text-center">Statut</th>
                <th className="py-4 px-4 text-right">Total TTC</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
              {chargement ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold space-y-2">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                    <div>Aucune commande trouvée pour ces critères.</div>
                  </td>
                </tr>
              ) : (
                commandes.map((cmd) => {
                  const nomClient = cmd.client?.nom || cmd.client_nom || "Client Particulier";
                  const estSelectionne = selection.has(cmd.id);

                  return (
                    <tr
                      key={cmd.id}
                      className={`transition-colors ${
                        estSelectionne
                          ? "bg-brand-orange/5 dark:bg-brand-orange/10"
                          : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/20"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={estSelectionne}
                          onChange={() => toggleSelection(cmd.id)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-brand-orange focus:ring-brand-orange cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-xs text-brand-orange">
                        <Link href={`/commandes/${cmd.id}`} className="hover:underline flex items-center gap-1.5">
                          <span>{cmd.numero}</span>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-bold">
                        {new Date(cmd.date_commande).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                        <Link
                          href={`/commandes/${cmd.id}`}
                          className="inline-flex items-center gap-1 btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold hover:text-brand-orange shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </Link>
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

          <div className="flex items-center gap-2">
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
              <option value="" disabled>Changer statut en masse...</option>
              <option value="payee">Passer en Payée</option>
              <option value="en_attente">Passer en En attente</option>
              <option value="devis">Passer en Devis</option>
              <option value="annulee">Passer en Annulée</option>
              <option value="remboursee">Passer en Remboursée</option>
            </select>

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

    </div>
  );
}
