"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayer, LAYER_PRIORITY } from "@/hooks/useLayerStack";
import { useT } from "@/lib/i18n/contexte";
import { formaterDA } from "@/lib/caisse";
import {
  IconeRecherche,
  IconeFermer,
  IconeArchive,
  IconeCamion,
  IconeBillet,
  IconePlus,
  IconePortefeuille,
  IconeTableauDeBord,
} from "./icons";
import BadgeStatut from "./BadgeStatut";

interface ResultatProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: string;
  prix_vente_fixe: number | null;
  href: string;
}

interface ResultatLot {
  id: number;
  fournisseur: string;
  statut_lot: string;
  date_entree: string;
  nb_produits: number;
  href: string;
}

interface ResultatFacture {
  id: number;
  numero: string;
  client_nom: string | null;
  total: number;
  date_emission: string;
  annulee: boolean;
  href: string;
}

interface ResultatsRecherche {
  produits: ResultatProduit[];
  lots: ResultatLot[];
  factures: ResultatFacture[];
}

interface ActionRapide {
  label: string;
  href: string;
  icone: React.ReactNode;
  roles?: string[];
}

export default function RechercheGlobale({
  role,
  ouverte,
  onFermer,
}: {
  role: string;
  ouverte: boolean;
  onFermer: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const champRef = useRef<HTMLInputElement>(null);
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ResultatsRecherche | null>(null);
  const [chargement, setChargement] = useState(false);
  const [indexActif, setIndexActif] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useLayer("recherche-globale", ouverte, onFermer, LAYER_PRIORITY.MODAL);

  const actionsRapides: ActionRapide[] = [
    { label: t("rechercheGlobale.nouveauLot"), href: "/arrivages/nouveau", icone: <IconePlus taille={16} />, roles: ["gerant"] },
    { label: t("rechercheGlobale.inventaire"), href: "/inventaire", icone: <IconeArchive taille={16} /> },
    { label: t("rechercheGlobale.arrivages"), href: "/arrivages", icone: <IconeCamion taille={16} />, roles: ["gerant", "technicien", "dev"] },
    { label: t("rechercheGlobale.caisse"), href: "/caisse", icone: <IconePortefeuille taille={16} />, roles: ["gerant", "dev"] },
    { label: t("rechercheGlobale.dashboard"), href: "/", icone: <IconeTableauDeBord taille={16} /> },
    { label: t("rechercheGlobale.factures"), href: "/factures", icone: <IconeBillet taille={16} /> },
  ].filter((a) => !a.roles || a.roles.includes(role));

  useEffect(() => {
    if (ouverte) {
      setRecherche("");
      setResultats(null);
      setIndexActif(-1);
      setTimeout(() => champRef.current?.focus(), 50);
    }
  }, [ouverte]);

  const chercher = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResultats(null);
      setChargement(false);
      return;
    }
    setChargement(true);
    try {
      const res = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as ResultatsRecherche;
        setResultats(data);
      }
    } catch {
      // Silencieux
    } finally {
      setChargement(false);
    }
  }, []);

  const gererSaisie = (valeur: string) => {
    setRecherche(valeur);
    setIndexActif(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void chercher(valeur), 200);
  };

  // Construire la liste plate de tous les liens navigables
  const tousLesLiens = (() => {
    const liens: { href: string; label: string }[] = [];
    if (resultats) {
      for (const p of resultats.produits) liens.push({ href: p.href, label: p.reference });
      for (const l of resultats.lots) liens.push({ href: l.href, label: l.fournisseur });
      for (const f of resultats.factures) liens.push({ href: f.href, label: f.numero });
    }
    if (!recherche.trim()) {
      for (const a of actionsRapides) liens.push({ href: a.href, label: a.label });
    }
    return liens;
  })();

  const naviguer = (href: string) => {
    onFermer();
    router.push(href);
  };

  const gererClavier = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndexActif((i) => Math.min(i + 1, tousLesLiens.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndexActif((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && indexActif >= 0 && tousLesLiens[indexActif]) {
      e.preventDefault();
      naviguer(tousLesLiens[indexActif].href);
    }
  };

  if (!ouverte) return null;

  let indexCompteur = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] animate-entree"
      onClick={onFermer}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 overflow-hidden rounded-2xl border border-brand-light-grey bg-brand-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={gererClavier}
      >
        {/* Champ de recherche */}
        <div className="flex items-center gap-3 border-b border-brand-light-grey px-4 py-3">
          <IconeRecherche taille={20} className="shrink-0 text-brand-warm-grey" />
          <input
            ref={champRef}
            type="text"
            value={recherche}
            onChange={(e) => gererSaisie(e.target.value)}
            placeholder={t("rechercheGlobale.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-brand-black outline-none placeholder:text-brand-grey"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-brand-light-grey bg-brand-paper px-1.5 py-0.5 text-[11px] font-medium text-brand-warm-grey">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onFermer}
            className="rounded-lg p-1 text-brand-warm-grey hover:bg-brand-light-grey/50 sm:hidden"
          >
            <IconeFermer taille={18} />
          </button>
        </div>

        {/* Résultats */}
        <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
          {chargement && (
            <div className="px-4 py-6 text-center text-sm text-brand-warm-grey">
              {t("rechercheGlobale.chargement")}
            </div>
          )}

          {!chargement && recherche.length >= 2 && resultats && (
            <>
              {resultats.produits.length === 0 && resultats.lots.length === 0 && resultats.factures.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-brand-warm-grey">
                  {t("rechercheGlobale.aucunResultat")}
                </div>
              )}

              {resultats.produits.length > 0 && (
                <div className="py-2">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-grey">
                    {t("rechercheGlobale.produits")}
                  </p>
                  {resultats.produits.map((p) => {
                    const idx = indexCompteur++;
                    return (
                      <button
                        key={`p-${p.id}`}
                        type="button"
                        onClick={() => naviguer(p.href)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          idx === indexActif ? "bg-brand-orange/10" : "hover:bg-brand-light-grey/30"
                        }`}
                      >
                        <IconeArchive taille={16} className="shrink-0 text-brand-orange" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-brand-black">
                            <span className="font-mono text-xs text-brand-warm-grey">{p.code_interne}</span>{" "}
                            {p.reference}
                          </span>
                          <span className="text-xs text-brand-warm-grey">
                            {p.categorie}
                            {p.prix_vente_fixe ? ` · ${formaterDA(p.prix_vente_fixe)}` : ""}
                          </span>
                        </span>
                        <BadgeStatut statut={p.statut as any} />
                      </button>
                    );
                  })}
                </div>
              )}

              {resultats.lots.length > 0 && (
                <div className="border-t border-brand-light-grey/50 py-2">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-grey">
                    {t("rechercheGlobale.lots")}
                  </p>
                  {resultats.lots.map((l) => {
                    const idx = indexCompteur++;
                    return (
                      <button
                        key={`l-${l.id}`}
                        type="button"
                        onClick={() => naviguer(l.href)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          idx === indexActif ? "bg-brand-orange/10" : "hover:bg-brand-light-grey/30"
                        }`}
                      >
                        <IconeCamion taille={16} className="shrink-0 text-brand-crystal" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-brand-black">
                            Lot #{l.id} — {l.fournisseur}
                          </span>
                          <span className="text-xs text-brand-warm-grey">
                            {l.nb_produits} produit{l.nb_produits > 1 ? "s" : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {resultats.factures.length > 0 && (
                <div className="border-t border-brand-light-grey/50 py-2">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-grey">
                    {t("rechercheGlobale.factures")}
                  </p>
                  {resultats.factures.map((f) => {
                    const idx = indexCompteur++;
                    return (
                      <button
                        key={`f-${f.id}`}
                        type="button"
                        onClick={() => naviguer(f.href)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          idx === indexActif ? "bg-brand-orange/10" : "hover:bg-brand-light-grey/30"
                        }`}
                      >
                        <IconeBillet taille={16} className="shrink-0 text-succes" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-brand-black">
                            {f.numero}
                            {f.client_nom ? ` — ${f.client_nom}` : ""}
                          </span>
                          <span className="text-xs text-brand-warm-grey">
                            {formaterDA(f.total)}
                            {f.annulee ? " · Annulée" : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Actions rapides (quand pas de recherche) */}
          {!recherche.trim() && (
            <div className="py-2">
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-grey">
                {t("rechercheGlobale.actionsRapides")}
              </p>
              {actionsRapides.map((a) => {
                const idx = indexCompteur++;
                return (
                  <button
                    key={a.href}
                    type="button"
                    onClick={() => naviguer(a.href)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      idx === indexActif ? "bg-brand-orange/10 text-brand-orange" : "text-brand-smooth hover:bg-brand-light-grey/30"
                    }`}
                  >
                    <span className="shrink-0 text-brand-warm-grey">{a.icone}</span>
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer avec raccourcis */}
        <div className="flex items-center gap-4 border-t border-brand-light-grey px-4 py-2 text-[11px] text-brand-grey">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-brand-light-grey bg-brand-paper px-1 py-0.5 font-mono">↑↓</kbd>
            {t("rechercheGlobale.naviguer")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-brand-light-grey bg-brand-paper px-1 py-0.5 font-mono">↵</kbd>
            {t("rechercheGlobale.ouvrir")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-brand-light-grey bg-brand-paper px-1 py-0.5 font-mono">esc</kbd>
            {t("rechercheGlobale.fermerLabel")}
          </span>
        </div>
      </div>
    </div>
  );
}
