"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import Modale from "@/components/Modale";
import { Plus, RefreshCw, Trash2, Edit2, Filter, BarChart3 } from "lucide-react";

/* ── Types ── */
interface Charge {
  id: number;
  categorie: string;
  libelle: string;
  description: string | null;
  montant: number;
  date_charge: string;
  mode_paiement: string;
  beneficiaire: string | null;
  reference: string | null;
  statut: string;
  notes: string | null;
  user: { id: number; username: string };
}

interface Stats {
  jour: number;
  semaine: number;
  mois: number;
  annee: number;
  total: number;
}

interface Repartition {
  categorie: string;
  _sum: { montant: number | null };
  _count: number;
}

const CATEGORIES = [
  { valeur: "loyer", label: "Loyer" },
  { valeur: "electricite", label: "Electricite" },
  { valeur: "internet", label: "Internet" },
  { valeur: "telephone", label: "Telephone" },
  { valeur: "salaires", label: "Salaires" },
  { valeur: "transport", label: "Transport" },
  { valeur: "carburant", label: "Carburant" },
  { valeur: "fournitures", label: "Fournitures" },
  { valeur: "maintenance", label: "Maintenance" },
  { valeur: "marketing", label: "Marketing" },
  { valeur: "logiciels", label: "Logiciels / Abonnements" },
  { valeur: "taxes", label: "Impots / Taxes" },
  { valeur: "bancaires", label: "Frais bancaires" },
  { valeur: "autre", label: "Autre" },
];

const MODES_PAIEMENT = [
  { valeur: "especes", label: "Especes" },
  { valeur: "virement", label: "Virement" },
  { valeur: "carte", label: "Carte" },
  { valeur: "cheque", label: "Cheque" },
  { valeur: "autre", label: "Autre" },
];

function categorieLabel(valeur: string): string {
  return CATEGORIES.find((c) => c.valeur === valeur)?.label || valeur;
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PageCharges() {
  const { afficher } = useToast();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [repartition, setRepartition] = useState<Repartition[]>([]);
  const [chargement, setChargement] = useState(true);

  const [modaleAjout, setModaleAjout] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreDateDebut, setFiltreDateDebut] = useState("");
  const [filtreDateFin, setFiltreDateFin] = useState("");

  // Formulaire ajout
  const [formCategorie, setFormCategorie] = useState("autre");
  const [formLibelle, setFormLibelle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMontant, setFormMontant] = useState("");
  const [formModePaiement, setFormModePaiement] = useState("especes");
  const [formBeneficiaire, setFormBeneficiaire] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const params = new URLSearchParams();
      if (filtreCategorie) params.set("categorie", filtreCategorie);
      if (filtreDateDebut) params.set("date_debut", filtreDateDebut);
      if (filtreDateFin) params.set("date_fin", filtreDateFin);

      const res = await fetch(`/api/charges?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCharges(data.charges || []);
        setStats(data.stats || null);
        setRepartition(data.repartition || []);
      }
    } catch {
      afficher("Erreur lors du chargement.", "erreur");
    } finally {
      setChargement(false);
    }
  }, [filtreCategorie, filtreDateDebut, filtreDateFin, afficher]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const supprimerCharge = async (id: number) => {
    if (!window.confirm("Supprimer cette charge ?")) return;
    try {
      const res = await fetch(`/api/charges/${id}`, { method: "DELETE" });
      if (res.ok) {
        afficher("Charge supprimee.", "succes");
        void charger();
      } else {
        const err = await res.json();
        afficher(err.error || "Erreur.", "erreur");
      }
    } catch {
      afficher("Erreur reseau.", "erreur");
    }
  };

  const enregistrer = async () => {
    if (!formLibelle.trim()) {
      afficher("Le libelle est obligatoire.", "erreur");
      return;
    }
    const montant = Number(formMontant);
    if (!Number.isFinite(montant) || montant <= 0) {
      afficher("Le montant doit etre positif.", "erreur");
      return;
    }

    setEnCours(true);
    try {
      const res = await fetch("/api/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorie: formCategorie,
          libelle: formLibelle,
          description: formDescription || undefined,
          montant,
          mode_paiement: formModePaiement,
          beneficiaire: formBeneficiaire || undefined,
          notes: formNotes || undefined,
        }),
      });
      if (res.ok) {
        afficher("Charge enregistree.", "succes");
        setModaleAjout(false);
        setFormLibelle("");
        setFormDescription("");
        setFormMontant("");
        setFormBeneficiaire("");
        setFormNotes("");
        void charger();
      } else {
        const err = await res.json();
        afficher(err.error || "Erreur.", "erreur");
      }
    } catch {
      afficher("Erreur reseau.", "erreur");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-brand-black dark:text-white">
          Charges / Depenses
        </h1>
        <button
          type="button"
          onClick={() => setModaleAjout(true)}
          className="btn btn-primaire text-xs py-2 px-4 rounded-2xl font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nouvelle charge
        </button>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Aujourd'hui", valeur: stats.jour },
            { label: "Semaine", valeur: stats.semaine },
            { label: "Mois", valeur: stats.mois },
            { label: "Annee", valeur: stats.annee },
            { label: "Total", valeur: stats.total },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-2xl bg-brand-paper dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/10">
              <p className="text-[10px] font-bold text-brand-warm-grey">{s.label}</p>
              <p className="text-sm font-black text-brand-black dark:text-white">{formaterDA(s.valeur)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Repartition par categorie */}
      {repartition.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey/60 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-brand-orange" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey">
              Repartition du mois
            </span>
          </div>
          <div className="space-y-2">
            {repartition.map((r) => {
              const pct = stats?.mois ? Math.round(((r._sum.montant ?? 0) / stats.mois) * 100) : 0;
              return (
                <div key={r.categorie} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-brand-warm-grey w-28 shrink-0 truncate">
                    {categorieLabel(r.categorie)}
                  </span>
                  <div className="flex-1 h-2 bg-brand-light-grey/30 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-brand-warm-grey w-20 text-right">
                    {formaterDA(r._sum.montant ?? 0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-brand-warm-grey" />
        <select
          value={filtreCategorie}
          onChange={(e) => setFiltreCategorie(e.target.value)}
          className="champ !w-auto !py-1.5 text-xs"
        >
          <option value="">Toutes les categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.valeur} value={c.valeur}>{c.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filtreDateDebut}
          onChange={(e) => setFiltreDateDebut(e.target.value)}
          className="champ !w-auto !py-1.5 text-xs"
          placeholder="Debut"
        />
        <input
          type="date"
          value={filtreDateFin}
          onChange={(e) => setFiltreDateFin(e.target.value)}
          className="champ !w-auto !py-1.5 text-xs"
          placeholder="Fin"
        />
        <button
          type="button"
          onClick={charger}
          className="p-1.5 rounded-xl hover:bg-brand-light-grey/40 transition"
        >
          <RefreshCw className="w-4 h-4 text-brand-warm-grey" />
        </button>
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-brand-paper animate-pulse" />
          ))}
        </div>
      ) : charges.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-brand-light-grey/60 rounded-2xl">
          <p className="text-sm text-brand-warm-grey font-bold">Aucune charge enregistree.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {charges.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-brand-light-grey/50 dark:border-white/10 bg-white dark:bg-brand-paper"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-orange/10 text-brand-orange">
                    {categorieLabel(c.categorie)}
                  </span>
                  <span className="text-sm font-black text-brand-black dark:text-white">
                    {c.libelle}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-brand-warm-grey">
                  <span>{dateFr(c.date_charge)}</span>
                  <span>{c.mode_paiement}</span>
                  {c.beneficiaire && <span>{c.beneficiaire}</span>}
                  <span>par {c.user.username}</span>
                </div>
                {c.description && (
                  <p className="text-[10px] text-brand-warm-grey mt-0.5 truncate">{c.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-brand-black dark:text-white">
                  {formaterDA(c.montant)}
                </span>
                <button
                  type="button"
                  onClick={() => void supprimerCharge(c.id)}
                  className="p-1.5 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'ajout */}
      <Modale
        titre="Nouvelle charge"
        ouverte={modaleAjout}
        onFermer={() => setModaleAjout(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Categorie
            </label>
            <select
              value={formCategorie}
              onChange={(e) => setFormCategorie(e.target.value)}
              className="champ"
            >
              {CATEGORIES.map((c) => (
                <option key={c.valeur} value={c.valeur}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Libelle <span className="text-brand-orange">*</span>
            </label>
            <input
              type="text"
              value={formLibelle}
              onChange={(e) => setFormLibelle(e.target.value)}
              placeholder="Ex: Loyer Septembre"
              className="champ"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Description
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Details optionnels"
              className="champ"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Montant (DA) <span className="text-brand-orange">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={formMontant}
              onChange={(e) => setFormMontant(e.target.value)}
              placeholder="ex: 50 000"
              className="champ text-right font-black"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Mode de paiement
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {MODES_PAIEMENT.map((m) => (
                <button
                  key={m.valeur}
                  type="button"
                  onClick={() => setFormModePaiement(m.valeur)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                    formModePaiement === m.valeur
                      ? "bg-brand-orange text-white border-brand-orange"
                      : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Beneficiaire / Fournisseur
            </label>
            <input
              type="text"
              value={formBeneficiaire}
              onChange={(e) => setFormBeneficiaire(e.target.value)}
              placeholder="Nom du fournisseur"
              className="champ"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Notes
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Notes interne"
              className="champ"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModaleAjout(false)}
              disabled={enCours}
              className="btn btn-secondaire text-xs py-2.5 px-5 rounded-2xl font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={enregistrer}
              disabled={enCours || !formLibelle.trim() || !formMontant}
              className="btn btn-primaire text-xs py-2.5 px-6 rounded-2xl font-black disabled:opacity-50"
            >
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modale>
    </div>
  );
}
