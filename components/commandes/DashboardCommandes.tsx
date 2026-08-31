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

  const [commandes, setCommandes] = useState<LigneCommandeDashboard[]>([]);
  const [chargement, setChargement] = useState(true);
  const [totalCommandes, setTotalCommandes] = useState(0);

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

  const badgeStatut = (statut: LigneCommandeDashboard["statut"]) => {
    switch (statut) {
      case "payee":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Payée
          </span>
        );
      case "en_attente":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> En attente
          </span>
        );
      case "devis":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-slate-300 border border-slate-300">
            <FileText className="w-3.5 h-3.5" /> Devis
          </span>
        );
      case "remboursee":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300">
            <RotateCcw className="w-3.5 h-3.5" /> Remboursée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300">
            <AlertCircle className="w-3.5 h-3.5" /> Annulée
          </span>
        );
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
          className="btn btn-primaire h-12 px-6 rounded-2xl font-black text-sm shadow-md shadow-brand-orange/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Vente / Caisse</span>
        </Link>
      </div>

      {/* Barre de Filtres Contextuels (Pills avec sync URL) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-zinc-800">
        
        {/* Périodes */}
        <div className="flex bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
          {[
            { id: "tous", label: "Toutes les dates" },
            { id: "aujourdhui", label: "Aujourd'hui" },
            { id: "semaine", label: "Cette semaine" },
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
          className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white shadow-xs focus:border-brand-orange"
        />
      </div>

      {/* Data Table des Commandes */}
      <div className="border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-800 text-slate-400 font-black uppercase text-[10px] tracking-wider">
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold space-y-2">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                    <div>Aucune commande trouvée pour ces critères.</div>
                  </td>
                </tr>
              ) : (
                commandes.map((cmd) => {
                  const nomClient = cmd.client?.nom || cmd.client_nom || "Client Particulier";
                  return (
                    <tr key={cmd.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/20 transition-colors">
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
                        {badgeStatut(cmd.statut)}
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

    </div>
  );
}
