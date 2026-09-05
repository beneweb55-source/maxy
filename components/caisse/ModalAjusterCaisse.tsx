"use client";

import { useState, useEffect, useCallback } from "react";
import { Banknote, Minus, Plus, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import Modale from "@/components/Modale";
import { formaterDA } from "@/lib/caisse";
import { useConfirmation } from "@/hooks/useConfirmation";
import ConfirmerAction from "@/components/ConfirmerAction";

type ModeAjustement = "ajouter" | "retirer";

interface Props {
  ouverte: boolean;
  onFermer: () => void;
  onTermine: () => void; // callback après succès pour recharger les stats
}

interface SoldesInfo {
  physique: { total: number; disponible: number; reserve: number };
  yalidine: { total: number; disponible: number; reserve: number };
}

export default function ModalAjusterCaisse({ ouverte, onFermer, onTermine }: Props) {
  const [mode, setMode] = useState<ModeAjustement>("ajouter");
  const [caisse, setCaisse] = useState<"CAISSE_PHYSIQUE" | "CAISSE_YALIDINE">("CAISSE_PHYSIQUE");
  const [soldes, setSoldes] = useState<SoldesInfo | null>(null);
  const [montant, setMontant] = useState<string>("");
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmationRequise, setConfirmationRequise] = useState<string | null>(null);
  const { confirmer, propsModal } = useConfirmation();

  // Charger les soldes à l'ouverture
  const chargerSoldes = useCallback(async () => {
    try {
      const res = await fetch("/api/caisse");
      if (res.ok) {
        const data = await res.json();
        setSoldes(data.soldes);
      }
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    if (ouverte) void chargerSoldes();
  }, [ouverte, chargerSoldes]);

  const montantNum = parseInt(montant.replace(/\D/g, ""), 10) || 0;
  const estValide = montantNum > 0;

  // Raccourcis rapides
  const raccourcis = [1000, 2000, 5000, 10000, 20000, 50000];

  const soumettre = async (confirmerSortie = false) => {
    if (!estValide || envoi) return;
    setEnvoi(true);
    setErreur(null);

    try {
      const typeMouvement = mode === "ajouter" ? "apport_associe" : "retrait_parts";

      const corps: Record<string, unknown> = {
        type: typeMouvement,
        montant: montantNum,
        caisse,
      };
      if (description.trim()) corps.description = description.trim();
      if (confirmerSortie) corps.confirmer = true;

      const res = await fetch("/api/caisse/mouvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });

      const data = await res.json().catch(() => null);

      // Si l'API demande une confirmation (sortie qui entame la réserve)
      if (data?.confirmation_required) {
        setEnvoi(false);
        setConfirmationRequise(data.message);
        const ok = await confirmer({
          titre: "Confirmation requise",
          message: data.message,
          labelConfirmer: "Confirmer le retrait",
          variante: "warning",
        });
        if (ok) {
          await soumettre(true);
        }
        setConfirmationRequise(null);
        return;
      }

      if (!res.ok) {
        setErreur(data?.error || "Erreur lors de l'opération.");
        setEnvoi(false);
        return;
      }

      // Succès
      const soldeApres = data?.solde_apres;
      const msg = mode === "ajouter"
        ? `${formaterDA(montantNum)} ajouté(s) à la caisse ${caisse === "CAISSE_PHYSIQUE" ? "physique" : "Yalidine"}.`
        : `${formaterDA(montantNum)} retiré(s) de la caisse ${caisse === "CAISSE_PHYSIQUE" ? "physique" : "Yalidine"}.`;

      // Reset
      setMontant("");
      setDescription("");
      setErreur(null);
      onTermine();

      // Message de succès dans la modale (on garde la modale ouverte 1.5s)
      setErreur(null);
      onFermer();
    } catch {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setEnvoi(false);
    }
  };

  const fermer = () => {
    if (envoi) return;
    setMontant("");
    setDescription("");
    setErreur(null);
    setConfirmationRequise(null);
    onFermer();
  };

  return (
    <>
      <ConfirmerAction {...propsModal} />
      <Modale
        titre="Ajuster la caisse"
        ouverte={ouverte}
        onFermer={fermer}
        large="sm"
      >
        <div className="space-y-5">
          {/* Toggle Ajouter / Retirer */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-brand-light-grey/30 dark:bg-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("ajouter")}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all min-h-[48px] ${
                mode === "ajouter"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-brand-warm-grey hover:bg-white/60 dark:hover:bg-white/10"
              }`}
            >
              <Plus className="w-5 h-5" />
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setMode("retirer")}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all min-h-[48px] ${
                mode === "retirer"
                  ? "bg-danger text-white shadow-md"
                  : "text-brand-warm-grey hover:bg-white/60 dark:hover:bg-white/10"
              }`}
            >
              <Minus className="w-5 h-5" />
              Retirer
            </button>
          </div>

          {/* Sélecteur de caisse */}
          <div>
            <label className="block text-[11px] font-bold text-brand-warm-grey uppercase tracking-wider mb-2">
              Destination
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCaisse("CAISSE_PHYSIQUE")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-bold transition-all min-h-[48px] ${
                  caisse === "CAISSE_PHYSIQUE"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-light-grey dark:border-white/10 hover:border-brand-orange/40 text-brand-warm-grey"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  Physique
                </span>
                {soldes && (
                  <span className="text-[11px] font-black opacity-80">
                    {formaterDA(soldes.physique.disponible)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCaisse("CAISSE_YALIDINE")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-bold transition-all min-h-[48px] ${
                  caisse === "CAISSE_YALIDINE"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-light-grey dark:border-white/10 hover:border-brand-orange/40 text-brand-warm-grey"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  Yalidine
                </span>
                {soldes && (
                  <span className="text-[11px] font-black opacity-80">
                    {formaterDA(soldes.yalidine.disponible)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-[11px] font-bold text-brand-warm-grey uppercase tracking-wider mb-2">
              Montant (DA)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={montant}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setMontant(raw ? String(parseInt(raw, 10)) : "");
                  setErreur(null);
                }}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper text-2xl font-black font-mono text-center focus:outline-none focus:border-brand-orange transition-colors min-h-[56px]"
                autoFocus
              />
              {montantNum > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-warm-grey">
                  DA
                </span>
              )}
            </div>
            {montantNum > 0 && (
              <>
                <p className="text-center text-xs text-brand-warm-grey mt-1">
                  {mode === "ajouter" ? "+" : "-"} {formaterDA(montantNum)}
                </p>
                {soldes && (
                  <p className="text-center text-[11px] mt-1">
                    <span className="text-brand-warm-grey">Solde actuel : </span>
                    <span className="font-bold text-brand-black dark:text-white">
                      {formaterDA(caisse === "CAISSE_PHYSIQUE" ? soldes.physique.disponible : soldes.yalidine.disponible)}
                    </span>
                    <span className="text-brand-warm-grey"> → </span>
                    <span className={`font-black ${
                      mode === "ajouter" ? "text-emerald-600" : "text-danger"
                    }`}>
                      {formaterDA(
                        (caisse === "CAISSE_PHYSIQUE" ? soldes.physique.disponible : soldes.yalidine.disponible)
                        + (mode === "ajouter" ? montantNum : -montantNum)
                      )}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Raccourcis rapides */}
          <div>
            <label className="block text-[11px] font-bold text-brand-warm-grey uppercase tracking-wider mb-2">
              Montants rapides
            </label>
            <div className="grid grid-cols-3 gap-2">
              {raccourcis.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMontant(String(r))}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                    montantNum === r
                      ? "bg-brand-orange text-white shadow-md"
                      : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange"
                  }`}
                >
                  {formaterDA(r)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-brand-warm-grey uppercase tracking-wider mb-2">
              Motif (optionnel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={mode === "ajouter" ? "Ex: Apport initial, Remboursement..." : "Ex: Achat fournitures, Frais bancaires..."}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper text-sm focus:outline-none focus:border-brand-orange transition-colors min-h-[44px]"
            />
          </div>

          {/* Erreur */}
          {erreur && (
            <div className="p-3 rounded-xl bg-danger/10 text-danger text-xs font-bold text-center">
              {erreur}
            </div>
          )}

          {/* Bouton de confirmation */}
          <button
            type="button"
            onClick={() => soumettre(false)}
            disabled={!estValide || envoi}
            className={`w-full py-3.5 rounded-xl text-sm font-black text-white transition-all min-h-[52px] ${
              envoi
                ? "opacity-50 cursor-not-allowed"
                : mode === "ajouter"
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                : "bg-danger hover:bg-danger/90 shadow-lg shadow-danger/20"
            }`}
          >
            {envoi ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Traitement en cours...
              </span>
            ) : mode === "ajouter" ? (
              <span className="flex items-center justify-center gap-2">
                <ArrowDownToLine className="w-4 h-4" />
                Ajouter {estValide ? formaterDA(montantNum) : ""}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ArrowUpFromLine className="w-4 h-4" />
                Retirer {estValide ? formaterDA(montantNum) : ""}
              </span>
            )}
          </button>
        </div>
      </Modale>
    </>
  );
}
