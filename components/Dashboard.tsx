"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLASSE_TAILLE } from "@/lib/dashboard/config";
import type { ReponseDashboard } from "@/lib/dashboard/types";
import { RenduWidget, widgetSansCarte } from "./dashboard/widgets";
import { IconeActualiser } from "./icons";

const INTERVALLE_RAFRAICHISSEMENT_MS = 5_000;


export default function Dashboard() {
  const [reponse, setReponse] = useState<ReponseDashboard | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [actualiseA, setActualiseA] = useState<Date | null>(null);
  const enCours = useRef(false);

  const charger = useCallback(async (silencieux: boolean) => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement du tableau de bord.");
      }
      setReponse((await res.json()) as ReponseDashboard);
      setErreur(null);
      setActualiseA(new Date());
    } catch (e) {
      if (!silencieux) setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      enCours.current = false;
    }
  }, []);

  useEffect(() => {
    void charger(false);
    const intervalle = setInterval(() => void charger(true), INTERVALLE_RAFRAICHISSEMENT_MS);
    const surFocus = () => void charger(true);
    window.addEventListener("focus", surFocus);
    return () => {
      clearInterval(intervalle);
      window.removeEventListener("focus", surFocus);
    };
  }, [charger]);

  if (erreur && !reponse) {
    return (
      <div className="space-y-3">
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
        <button type="button" onClick={() => void charger(false)} className="btn btn-secondaire">
          Réessayer
        </button>
      </div>
    );
  }
  if (!reponse) {
    return <p className="p-4 text-sm text-brand-warm-grey">Chargement du tableau de bord…</p>;
  }

  const { config, donnees } = reponse;

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">{config.titre}</h1>
        <p className="flex items-center gap-2 text-xs text-brand-grey">
          {actualiseA &&
            `Actualisé à ${actualiseA.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
          <button
            type="button"
            onClick={() => void charger(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-light-grey bg-brand-white px-3 py-1.5 text-xs font-semibold text-brand-warm-grey transition hover-lift hover:text-brand-orange hover:border-brand-orange/30 shadow-sm"
          >
            <IconeActualiser taille={14} />
            Actualiser
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {config.widgets.map((widget, index) =>
          widgetSansCarte(widget) ? (
            <div key={widget.id} className={`col-span-1 ${CLASSE_TAILLE[widget.taille]} animate-entree`} style={{ animationDelay: `${index * 50}ms` }}>
              {widget.titre && <h2 className="libelle mb-3 text-brand-smooth/80">{widget.titre}</h2>}
              <RenduWidget widget={widget} donnees={donnees} />
            </div>
          ) : (
            <section
              key={widget.id}
              className={`carte col-span-1 ${CLASSE_TAILLE[widget.taille]} animate-entree flex flex-col`} style={{ animationDelay: `${index * 50}ms` }}
            >
              {widget.titre && <h2 className="libelle mb-4 text-brand-smooth/80">{widget.titre}</h2>}
              <div className="flex-1">
                <RenduWidget widget={widget} donnees={donnees} />
              </div>
            </section>
          )
        )}
      </div>
    </div>
  );
}
