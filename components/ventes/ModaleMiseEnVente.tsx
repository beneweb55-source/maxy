"use client";

import React, { useState, useEffect } from "react";
import Modale from "@/components/Modale";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { IconeEtiquette } from "@/components/icons";

export interface ExemplaireMiseEnVente {
  id: number;
  code_interne: string;
  prix_vente_fixe?: number | null;
  prix_achat?: number;
}

interface ModaleMiseEnVenteProps {
  ouverte: boolean;
  reference: string;
  categorie?: string;
  unites: ExemplaireMiseEnVente[];
  prixActuel?: number | null;
  onFermer: () => void;
  onSucces: () => void;
}

export default function ModaleMiseEnVente({
  ouverte,
  reference,
  categorie,
  unites,
  prixActuel,
  onFermer,
  onSucces,
}: ModaleMiseEnVenteProps) {
  const { afficher } = useToast();
  const [envoi, setEnvoi] = useState(false);
  const [prix, setPrix] = useState("");
  const [unitesSelectionnees, setUnitesSelectionnees] = useState<number[]>([]);

  useEffect(() => {
    if (ouverte) {
      setPrix(prixActuel ? String(prixActuel) : "");
      setUnitesSelectionnees(unites.map((u) => u.id));
    }
  }, [ouverte, prixActuel, unites]);

  const prixAchatMoyen =
    unites.length > 0 && unites[0]?.prix_achat
      ? Math.round(unites.reduce((s, u) => s + (u.prix_achat || 0), 0) / unites.length)
      : null;

  async function validerMiseEnVente() {
    const p = Number(prix);
    if (!p || p <= 0) {
      afficher("Veuillez saisir un prix de vente valide supérieur à 0 DA.", "erreur");
      return;
    }
    if (unitesSelectionnees.length === 0) {
      afficher("Veuillez sélectionner au moins un exemplaire.", "erreur");
      return;
    }

    setEnvoi(true);
    try {
      const res = await fetch("/api/produits/masse/prix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: unitesSelectionnees,
          prix_vente_fixe: p,
        }),
      });

      const corps = (await res.json().catch(() => null)) as {
        error?: string;
        modifies?: number;
      } | null;

      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la mise en vente.", "erreur");
        return;
      }

      afficher(
        `${unitesSelectionnees.length} exemplaire(s) mis en vente avec succès à ${formaterDA(p)}.`
      );
      onSucces();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale
      titre={`Mise en vente — ${reference}`}
      ouverte={ouverte}
      onFermer={onFermer}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20">
          <div className="min-w-0">
            <div className="text-xs font-black text-brand-orange truncate">{reference}</div>
            {categorie && (
              <div className="text-[11px] font-semibold text-brand-warm-grey">{categorie}</div>
            )}
          </div>
          <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-brand-orange text-white">
            {unites.length} exemplaire{unites.length > 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-xs text-brand-warm-grey">
          Fixez le prix de vente unitaire. Tous les exemplaires sélectionnés passeront automatiquement en statut <strong>En vente</strong> et deviendront vendables en caisse et vitrine.
        </p>

        {/* Champ Prix Fixe */}
        <div>
          <label className="libelle mb-1.5" htmlFor="prix-mise-en-vente-unifie">
            Prix de vente unitaire (DA) *
          </label>
          <div className="relative">
            <input
              id="prix-mise-en-vente-unifie"
              type="number"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="Ex. 45000"
              autoFocus
              className="champ text-lg font-mono font-bold pr-12"
            />
            <span className="absolute right-3.5 top-3.5 text-xs font-black text-brand-warm-grey">
              DA
            </span>
          </div>

          {/* Suggestions de marge rapide si prix d'achat connu */}
          {prixAchatMoyen && prixAchatMoyen > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
              <span className="text-brand-warm-grey font-medium">Achat moyen: {formaterDA(prixAchatMoyen)} ➔</span>
              {[1.15, 1.20, 1.25, 1.30].map((coeff) => {
                const sugg = Math.round((prixAchatMoyen * coeff) / 500) * 500;
                const pct = Math.round((coeff - 1) * 100);
                return (
                  <button
                    key={coeff}
                    type="button"
                    onClick={() => setPrix(String(sugg))}
                    className="px-2 py-0.5 rounded-lg bg-brand-light-grey/40 hover:bg-brand-orange/15 hover:text-brand-orange font-mono font-bold text-[11px] transition-colors"
                  >
                    +{pct}% ({formaterDA(sugg)})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sélection des exemplaires si multiples */}
        {unites.length > 1 && (
          <div className="space-y-2 pt-2 border-t border-brand-light-grey/50">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>
                Exemplaires concernés ({unitesSelectionnees.length}/{unites.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setUnitesSelectionnees(
                    unitesSelectionnees.length === unites.length ? [] : unites.map((u) => u.id)
                  )
                }
                className="text-brand-orange hover:underline text-xs font-semibold"
              >
                {unitesSelectionnees.length === unites.length
                  ? "Tout désélectionner"
                  : "Tout sélectionner"}
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl bg-brand-light-grey/20 p-2 text-xs">
              {unites.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-brand-white/80"
                >
                  <input
                    type="checkbox"
                    checked={unitesSelectionnees.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUnitesSelectionnees([...unitesSelectionnees, u.id]);
                      } else {
                        setUnitesSelectionnees(unitesSelectionnees.filter((id) => id !== u.id));
                      }
                    }}
                    className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4"
                  />
                  <span className="font-mono font-bold text-brand-black">{u.code_interne}</span>
                  {u.prix_vente_fixe && (
                    <span className="text-brand-warm-grey">({formaterDA(u.prix_vente_fixe)})</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-light-grey/50">
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-secondaire text-xs font-bold"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={
              envoi ||
              !prix.trim() ||
              Number(prix) <= 0 ||
              unitesSelectionnees.length === 0
            }
            onClick={validerMiseEnVente}
            className="btn btn-primaire text-xs font-bold shadow-md gap-1.5"
          >
            <IconeEtiquette taille={15} />
            {envoi ? "Mise en vente..." : "Valider et Mettre en vente"}
          </button>
        </div>
      </div>
    </Modale>
  );
}
