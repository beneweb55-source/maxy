"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import Modale from "@/components/Modale";
import {
  ArrowLeft,
  Plus,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface CreditDetail {
  id: number;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  statut: string;
  date_vente: string;
  date_echeance: string | null;
  notes: string | null;
  client: { id: number; nom: string; telephone: string | null; email: string | null; adresse: string | null };
  vente: {
    id: number;
    prix_vente_reel: number;
    date_vente: string;
    type_vente: string;
    produit: { code_interne: string; reference: string; categorie: string };
  };
  paiements: {
    id: number;
    montant: number;
    mode_paiement: string;
    date_paiement: string;
    reference: string | null;
    notes: string | null;
    user: { username: string };
  }[];
}

const MODES_PAIEMENT = [
  { valeur: "especes", label: "Espèces" },
  { valeur: "virement", label: "Virement" },
  { valeur: "carte", label: "Carte" },
  { valeur: "cheque", label: "Chèque" },
  { valeur: "autre", label: "Autre" },
];

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateHeureFr(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DetailCredit({
  creditId,
  onRetour,
}: {
  creditId: number;
  onRetour: () => void;
}) {
  const { afficher } = useToast();
  const [credit, setCredit] = useState<CreditDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [modalePaiement, setModalePaiement] = useState(false);
  const [montantPaiement, setMontantPaiement] = useState("");
  const [modePaiement, setModePaiement] = useState("especes");
  const [referencePaiement, setReferencePaiement] = useState("");
  const [notesPaiement, setNotesPaiement] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [modaleSuppression, setModaleSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const chargerCredit = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/credits/${creditId}`);
      if (res.ok) {
        setCredit(await res.json());
      }
    } catch {
      afficher("Erreur lors du chargement.", "erreur");
    } finally {
      setChargement(false);
    }
  }, [creditId, afficher]);

  useEffect(() => {
    void chargerCredit();
  }, [chargerCredit]);

  const enregistrerPaiement = async () => {
    const montant = Number(montantPaiement);
    if (!Number.isFinite(montant) || montant <= 0) {
      afficher("Veuillez saisir un montant valide.", "erreur");
      return;
    }
    if (credit && montant > credit.montant_restant) {
      afficher(`Le montant dépasse le reste (${formaterDA(credit.montant_restant)}).`, "erreur");
      return;
    }

    setEnCours(true);
    try {
      const res = await fetch(`/api/credits/${creditId}/paiements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montant,
          mode_paiement: modePaiement,
          reference: referencePaiement || undefined,
          notes: notesPaiement || undefined,
        }),
      });

      if (res.ok) {
        afficher(`Paiement de ${formaterDA(montant)} enregistré.`, "succes");
        setModalePaiement(false);
        setMontantPaiement("");
        setReferencePaiement("");
        setNotesPaiement("");
        void chargerCredit();
      } else {
        const err = await res.json();
        afficher(err.error || "Erreur lors de l'enregistrement.", "erreur");
      }
    } catch {
      afficher("Erreur réseau.", "erreur");
    } finally {
      setEnCours(false);
    }
  };

  const supprimerCredit = async () => {
    setSuppressionEnCours(true);
    try {
      const res = await fetch(`/api/credits/${creditId}`, { method: "DELETE" });
      if (res.ok) {
        afficher("Crédit supprimé.", "succes");
        onRetour();
      } else {
        const err = await res.json();
        afficher(err.error || "Erreur lors de la suppression.", "erreur");
      }
    } catch {
      afficher("Erreur réseau.", "erreur");
    } finally {
      setSuppressionEnCours(false);
      setModaleSuppression(false);
    }
  };

  if (chargement) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-32 rounded-xl bg-brand-paper animate-pulse" />
        <div className="h-48 rounded-2xl bg-brand-paper animate-pulse" />
      </div>
    );
  }

  if (!credit) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-brand-warm-grey">Crédit introuvable.</p>
        <button onClick={onRetour} className="mt-4 btn btn-primaire text-xs">
          Retour
        </button>
      </div>
    );
  }

  const pctPaye = credit.montant_total > 0
    ? Math.round((credit.montant_paye / credit.montant_total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Retour */}
      <button
        type="button"
        onClick={onRetour}
        className="flex items-center gap-2 text-xs font-bold text-brand-warm-grey hover:text-brand-black transition"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux crédits
      </button>

      {/* En-tête client */}
      <div className="p-4 rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey/60 dark:border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-black text-brand-black dark:text-white">
              {credit.client.nom}
            </h2>
            <div className="flex items-center gap-3 text-xs text-brand-warm-grey mt-1">
              {credit.client.telephone && <span>{credit.client.telephone}</span>}
              {credit.client.email && <span>{credit.client.email}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-warm-grey">Vente #{credit.vente.id}</p>
            <p className="text-[10px] text-brand-warm-grey">
              {credit.vente.produit.reference} · {dateFr(credit.date_vente)}
            </p>
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-brand-orange/5 border border-brand-orange/20">
          <p className="text-[10px] font-bold text-brand-warm-grey">Total</p>
          <p className="text-sm font-black text-brand-orange">{formaterDA(credit.montant_total)}</p>
        </div>
        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
          <p className="text-[10px] font-bold text-brand-warm-grey">Payé ({pctPaye}%)</p>
          <p className="text-sm font-black text-green-600">{formaterDA(credit.montant_paye)}</p>
        </div>
        <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
          <p className="text-[10px] font-bold text-brand-warm-grey">Reste</p>
          <p className="text-sm font-black text-danger">{formaterDA(credit.montant_restant)}</p>
        </div>
        <div className="p-3 rounded-xl bg-brand-paper dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/10">
          <p className="text-[10px] font-bold text-brand-warm-grey">Statut</p>
          <div className="mt-0.5">
            {credit.statut === "paye" && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Payé
              </span>
            )}
            {credit.statut === "partiellement_paye" && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                <Clock className="w-3.5 h-3.5" /> Partiel
              </span>
            )}
            {(credit.statut === "impaye" || credit.statut === "en_retard") && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" /> {credit.statut === "en_retard" ? "En retard" : "Impayé"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-brand-warm-grey">
          <span>Progression du paiement</span>
          <span>{pctPaye}%</span>
        </div>
        <div className="h-2.5 bg-brand-light-grey/40 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pctPaye}%`,
              backgroundColor: pctPaye >= 100 ? "#22c55e" : pctPaye >= 50 ? "#3b82f6" : "#f97316",
            }}
          />
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center gap-2 flex-wrap">
        {credit.statut !== "paye" && (
          <button
            type="button"
            onClick={() => setModalePaiement(true)}
            className="btn btn-primaire text-xs py-2.5 px-5 rounded-2xl font-black flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" /> Enregistrer un paiement
          </button>
        )}
        <button
          type="button"
          onClick={() => setModaleSuppression(true)}
          className="text-xs py-2.5 px-5 rounded-2xl font-bold border border-danger/30 text-danger hover:bg-danger/10 transition flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Supprimer le crédit
        </button>
      </div>

      {/* Historique des paiements */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey">
          Historique des paiements ({credit.paiements.length})
        </h3>
        {credit.paiements.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-brand-light-grey/60 rounded-2xl">
            <p className="text-xs text-brand-warm-grey">Aucun paiement enregistré.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {credit.paiements.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-green-500/5 dark:bg-green-500/10 border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-green-700 dark:text-green-400">
                      {formaterDA(p.montant)}
                    </p>
                    <p className="text-[10px] text-brand-warm-grey">
                      {dateHeureFr(p.date_paiement)} · {p.mode_paiement}
                      {p.reference && ` · ${p.reference}`}
                      {p.notes && ` · ${p.notes}`}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-brand-warm-grey shrink-0">
                  {p.user.username}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale de paiement */}
      <Modale
        titre="Enregistrer un paiement"
        ouverte={modalePaiement}
        onFermer={() => setModalePaiement(false)}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-brand-orange/5 border border-brand-orange/20">
            <p className="text-[10px] font-bold text-brand-warm-grey">Reste à payer</p>
            <p className="text-lg font-black text-brand-orange">
              {formaterDA(credit.montant_restant)}
            </p>
          </div>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Montant (DA)
            </label>
            <input
              type="number"
              min={1}
              max={credit.montant_restant}
              value={montantPaiement}
              onChange={(e) => setMontantPaiement(e.target.value)}
              placeholder={`Max: ${credit.montant_restant}`}
              className="champ text-right font-black"
              autoFocus
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
                  onClick={() => setModePaiement(m.valeur)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                    modePaiement === m.valeur
                      ? "bg-brand-orange text-white border-brand-orange"
                      : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {(modePaiement === "virement" || modePaiement === "cheque") && (
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
                Référence
              </label>
              <input
                type="text"
                value={referencePaiement}
                onChange={(e) => setReferencePaiement(e.target.value)}
                placeholder="N° chèque, réf. virement..."
                className="champ"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Notes (optionnel)
            </label>
            <input
              type="text"
              value={notesPaiement}
              onChange={(e) => setNotesPaiement(e.target.value)}
              placeholder="Note interne..."
              className="champ"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalePaiement(false)}
              disabled={enCours}
              className="btn btn-secondaire text-xs py-2.5 px-5 rounded-2xl font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={enregistrerPaiement}
              disabled={enCours || !montantPaiement}
              className="btn btn-primaire text-xs py-2.5 px-6 rounded-2xl font-black flex items-center gap-2 disabled:opacity-50"
            >
              {enCours ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Valider
                </>
              )}
            </button>
          </div>
        </div>
      </Modale>

      {/* Modale de suppression */}
      <Modale
        titre="Supprimer le crédit"
        ouverte={modaleSuppression}
        onFermer={() => !suppressionEnCours && setModaleSuppression(false)}
      >
        <div className="space-y-4">
          <p className="text-xs text-brand-warm-grey">
            Voulez-vous vraiment supprimer ce crédit ? Cette action est irréversible.
          </p>
          <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
            <p className="text-xs font-bold text-danger">
              {credit.client.nom} — {formaterDA(credit.montant_restant)} restant
            </p>
            <p className="text-[10px] text-brand-warm-grey mt-0.5">
              La vente originale ne sera pas supprimée.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModaleSuppression(false)}
              disabled={suppressionEnCours}
              className="btn btn-secondaire text-xs py-2.5 px-5 rounded-2xl font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={supprimerCredit}
              disabled={suppressionEnCours}
              className="text-xs py-2.5 px-6 rounded-2xl font-black bg-danger text-white hover:bg-danger/80 transition flex items-center gap-2 disabled:opacity-50"
            >
              {suppressionEnCours ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Suppression...
                </span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </Modale>
    </div>
  );
}
