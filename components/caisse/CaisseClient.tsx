"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role, TypeMouvement } from "@prisma/client";
import Link from "next/link";
import Modale from "@/components/Modale";
import { useToast } from "@/components/toast";
import { formaterDA, sensMouvement, TYPES_MANUELS } from "@/lib/caisse";
import {
  IconeAlerte,
  IconeChevronGauche,
  IconeChevronDroite,
  IconeCocheCercle,
  IconeTelechargement,
} from "@/components/icons";

interface MouvementDto {
  id: number;
  date: string;
  type: TypeMouvement;
  montant: number;
  solde_apres: number;
  description: string | null;
  par: string;
}

interface ReponseCaisse {
  soldes: { total: number; reserve: number; disponible: number };
  parametres: { marge_minimum_pct: number; objectif_reserve: number };
  graphique_soldes: { jour: {label: string, solde: number}[], mois: {label: string, solde: number}[], an: {label: string, solde: number}[] };
  repartition: { mois: string; deja_appliquee: boolean; benefice_mois: number };
  page: number;
  pages: number;
  total: number;
  mouvements: MouvementDto[];
}

export const LIBELLES_TYPE: Record<TypeMouvement, string> = {
  achat_lot: "Achat de lot",
  vente: "Vente",
  annulation_vente: "Annulation de vente",
  apport_associe: "Apport associé",
  achat_piece: "Achat de pièce",
  frais: "Frais",
  retrait_parts: "Retrait des parts",
  transfert_reserve: "Transfert réserve",
  reinvest: "Réinvestissement",
};

export default function CaisseClient({ role }: { role: Role }) {
  const { afficher } = useToast();
  const [donnees, setDonnees] = useState<ReponseCaisse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [envoi, setEnvoi] = useState(false);

  const [typeMouvement, setTypeMouvement] = useState<TypeMouvement>("apport_associe");
  const [montant, setMontant] = useState("");
  const [description, setDescription] = useState("");
  const [confirmationMouvement, setConfirmationMouvement] = useState<string | null>(null);

  const [confirmationRepartition, setConfirmationRepartition] = useState<string | null>(null);
  const [pctReinvest, setPctReinvest] = useState(50);
  const [pctReserve, setPctReserve] = useState(20);
  const [pctParts, setPctParts] = useState(20);
  const [pctFrais, setPctFrais] = useState(10);

  const estGerant = role === "gerant";

  const rafraichir = useCallback(async () => {
    try {
      const res = await fetch(`/api/caisse?page=${page}`);
      const corps = (await res.json().catch(() => null)) as
        | ReponseCaisse
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      
      setErreur(null);
      setDonnees((prev) => {
        if (!prev) {
          const d = corps as any;
          if (d.parametres) {
            setPctReinvest(d.parametres.pct_reinvest ?? 50);
            setPctReserve(d.parametres.pct_reserve ?? 20);
            setPctParts(d.parametres.pct_parts ?? 20);
            setPctFrais(d.parametres.pct_frais ?? 10);
          }
        }
        return corps as ReponseCaisse;
      });
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [page]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  async function enregistrerMouvement(confirmer: boolean) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/caisse/mouvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: typeMouvement,
          montant: Number(montant),
          description: description.trim() || undefined,
          confirmer: confirmer || undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'enregistrement.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setConfirmationMouvement(corps.message ?? "Confirmer ce mouvement ?");
        return;
      }
      afficher(
        `Mouvement enregistré : ${LIBELLES_TYPE[typeMouvement]} — ${formaterDA(Number(montant))}.`
      );
      setMontant("");
      setDescription("");
      setConfirmationMouvement(null);
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function appliquerRepartition(confirmer: boolean) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/caisse/repartition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmer: confirmer || undefined,
          pctReinvest,
          pctReserve,
          pctParts,
          pctFrais
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            confirmation_required?: boolean;
            message?: string;
            error?: string;
            parts_vers_reserve?: boolean;
          }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la répartition.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setConfirmationRepartition(corps.message ?? "Confirmer la répartition ?");
        return;
      }
      afficher(
        corps?.parts_vers_reserve
          ? "Répartition appliquée — parts redirigées vers la réserve."
          : "Répartition mensuelle appliquée (4 mouvements créés)."
      );
      setConfirmationRepartition(null);
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  if (erreur && !donnees) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}
      </div>
    );
  }
  if (!donnees)
    return <p className="p-4 text-sm text-brand-warm-grey">Chargement de la caisse…</p>;

  const { soldes, parametres, repartition } = donnees;
  const pctAtteintReserve =
    parametres.objectif_reserve > 0
      ? Math.min(100, Math.round((soldes.reserve / parametres.objectif_reserve) * 100))
      : 100;

  const benefice = repartition.benefice_mois;

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Caisse</h1>
        <div className="flex gap-2">
          <Link href="/caisse/rapport" className="btn btn-primaire">
            Créer un rapport
          </Link>
          <a href="/api/caisse/export" className="btn btn-secondaire">
            <IconeTelechargement taille={15} />
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="carte">
          <p className="libelle">Solde total</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formaterDA(soldes.total)}</p>
        </div>
        <div className="carte">
          <p className="libelle">Fonds de réserve</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formaterDA(soldes.reserve)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-light-grey">
            <div
              className={`h-full rounded-full ${pctAtteintReserve >= 100 ? "bg-succes" : "bg-brand-orange"}`}
              style={{ width: `${pctAtteintReserve}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-brand-warm-grey">
            {pctAtteintReserve} % de l'objectif ({formaterDA(parametres.objectif_reserve)})
          </p>
        </div>
        <div className="carte">
          <p className="libelle">Disponible hors réserve</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {formaterDA(soldes.disponible)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="carte">
          <h2 className="libelle text-brand-smooth">Évolution du solde — 6 mois</h2>
          <GraphiqueLigne donnees={donnees.graphique_soldes} />
        </section>

        <section className="carte">
          <h2 className="libelle text-brand-smooth">
            Répartition mensuelle — {repartition.mois}
          </h2>
          {repartition.deja_appliquee ? (
            <p className="bandeau-succes mt-3 flex items-center gap-2">
              <IconeCocheCercle taille={15} />
              Répartition déjà appliquée ce mois-ci (une seule par mois).
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm">
                Bénéfice du mois (somme des marges des ventes) :{" "}
                <strong>{formaterDA(benefice)}</strong>
              </p>
              {benefice > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-brand-light-grey/20 p-2 rounded text-sm">
                    <span className="text-brand-warm-grey">Total des pourcentages</span>
                    <span className={`font-bold ${pctReinvest + pctReserve + pctParts + pctFrais !== 100 ? "text-danger" : "text-succes"}`}>
                      {pctReinvest + pctReserve + pctParts + pctFrais} %
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-brand-light-grey/50">
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Réinvestissement
                          <input type="number" min="0" max="100" value={pctReinvest} onChange={e => setPctReinvest(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">{formaterDA(Math.round(benefice * (pctReinvest / 100)))}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Fonds de réserve
                          <input type="number" min="0" max="100" value={pctReserve} onChange={e => setPctReserve(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctReserve / 100)))}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Parts associés
                          <input type="number" min="0" max="100" value={pctParts} onChange={e => setPctParts(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctParts / 100)))}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Frais divers
                          <input type="number" min="0" max="100" value={pctFrais} onChange={e => setPctFrais(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctFrais / 100)))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {estGerant ? (
                <button
                  type="button"
                  disabled={envoi || benefice <= 0 || (pctReinvest + pctReserve + pctParts + pctFrais !== 100)}
                  onClick={() => {
                    setConfirmationRepartition(
                      `Confirmez-vous la répartition de ${formaterDA(benefice)} avec ces pourcentages : Réinvest. (${pctReinvest}%), Réserve (${pctReserve}%), Parts (${pctParts}%), Frais (${pctFrais}%) ?`
                    );
                  }}
                  title={benefice <= 0 ? "Aucun bénéfice à répartir ce mois-ci" : undefined}
                  className="btn btn-primaire w-full"
                >
                  Appliquer la répartition
                </button>
              ) : (
                <p className="text-xs text-brand-warm-grey">
                  Seul le gérant applique la répartition.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {estGerant && (
        <section className="carte">
          <h2 className="libelle text-brand-smooth">Nouveau mouvement manuel</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="libelle mb-1.5" htmlFor="type-mvt">
                Type
              </label>
              <select
                id="type-mvt"
                value={typeMouvement}
                onChange={(e) => setTypeMouvement(e.target.value as TypeMouvement)}
                className="champ w-auto"
              >
                {TYPES_MANUELS.map((t) => (
                  <option key={t} value={t}>
                    {LIBELLES_TYPE[t as TypeMouvement]} (
                    {sensMouvement(t) === "entree"
                      ? "entrée"
                      : sensMouvement(t) === "sortie"
                        ? "sortie"
                        : "neutre"}
                    )
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="montant-mvt">
                Montant (DA)
              </label>
              <input
                id="montant-mvt"
                type="number"
                min={1}
                step={1}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="champ w-36"
              />
            </div>
            <div className="min-w-48 flex-1">
              <label className="libelle mb-1.5" htmlFor="desc-mvt">
                Description
              </label>
              <input
                id="desc-mvt"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex. Achat clavier de remplacement"
                className="champ"
              />
            </div>
            <button
              type="button"
              disabled={envoi || !montant.trim()}
              onClick={() => void enregistrerMouvement(false)}
              className="btn btn-primaire"
            >
              Enregistrer
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-warm-grey">
            Les mouvements achat de lot, vente et annulation de vente sont créés automatiquement
            par le système. Rien ne se supprime jamais.
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="libelle text-brand-smooth">
          Historique ({donnees.total} mouvement{donnees.total > 1 ? "s" : ""})
        </h2>
        <div className="space-y-4">
          {/* Vue Mobile: Cartes */}
          <div className="flex flex-col gap-3 md:hidden">
            {donnees.mouvements.length === 0 && (
              <div className="carte border-dashed text-center p-6 text-brand-warm-grey text-sm">
                Aucun mouvement pour le moment. La caisse démarre à 0 DA.
              </div>
            )}
            {donnees.mouvements.map((m) => {
              const sens = sensMouvement(m.type);
              return (
                <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-brand-light-grey bg-brand-white p-4 shadow-sm text-sm">
                  <div className="flex items-start justify-between border-b border-brand-light-grey/50 pb-2 mb-1">
                    <div className="flex flex-col">
                      <span className="font-semibold text-brand-black">{LIBELLES_TYPE[m.type]}</span>
                      <span className="text-xs text-brand-warm-grey">
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${sens === "entree" ? "text-succes" : sens === "sortie" ? "text-danger" : "text-brand-warm-grey"}`}>
                        {sens === "entree" ? "+" : sens === "sortie" ? "−" : "="} {formaterDA(m.montant)}
                      </span>
                    </div>
                  </div>
                  <div className="text-brand-warm-grey">{m.description ?? "—"}</div>
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-brand-light-grey/50">
                    <span className="text-xs text-brand-grey">Par: <span className="font-semibold text-brand-black">{m.par}</span></span>
                    <span className="text-xs text-brand-grey">Solde: <span className="font-bold text-brand-black">{formaterDA(m.solde_apres)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vue Bureau: Tableau */}
          <div className="hidden overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-brand-light-grey/25">
                <tr>
                  <th className="entete-table">Date</th>
                  <th className="entete-table">Type</th>
                  <th className="entete-table">Description</th>
                  <th className="entete-table">Par</th>
                  <th className="entete-table text-right">Montant</th>
                  <th className="entete-table text-right">Solde après</th>
                </tr>
              </thead>
              <tbody className="">
                {donnees.mouvements.length === 0 && (
                  <tr className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                    <td colSpan={6} className="px-3 py-6 text-center text-brand-warm-grey">
                      Aucun mouvement pour le moment. La caisse démarre à 0 DA — enregistrez un
                      apport associé pour l'alimenter.
                    </td>
                  </tr>
                )}
                {donnees.mouvements.map((m) => {
                  const sens = sensMouvement(m.type);
                  return (
                    <tr key={m.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                      <td className="px-3 py-2 text-xs">
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">{LIBELLES_TYPE[m.type]}</td>
                      <td
                        className="max-w-72 truncate px-3 py-2 text-brand-warm-grey"
                        title={m.description ?? ""}
                      >
                        {m.description ?? "—"}
                      </td>
                      <td className="px-3 py-2">{m.par}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          sens === "entree"
                            ? "text-succes"
                            : sens === "sortie"
                              ? "text-danger"
                              : "text-brand-warm-grey"
                        }`}
                      >
                        {sens === "entree" ? "+" : sens === "sortie" ? "−" : "="}{" "}
                        {formaterDA(m.montant)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formaterDA(m.solde_apres)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {donnees.pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn btn-secondaire"
            >
              <IconeChevronGauche taille={15} />
              Précédent
            </button>
            <span className="px-2 text-brand-warm-grey">
              Page {page} / {donnees.pages}
            </span>
            <button
              type="button"
              disabled={page >= donnees.pages}
              onClick={() => setPage(page + 1)}
              className="btn btn-secondaire"
            >
              Suivant
              <IconeChevronDroite taille={15} />
            </button>
          </div>
        )}
      </section>

      <Modale
        titre="Confirmation requise"
        ouverte={confirmationMouvement !== null}
        onFermer={() => setConfirmationMouvement(null)}
      >
        <p className="flex items-start gap-2 text-sm text-brand-smooth">
          <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
          {confirmationMouvement}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmationMouvement(null)}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() => void enregistrerMouvement(true)}
            className="btn btn-primaire"
          >
            Confirmer le mouvement
          </button>
        </div>
      </Modale>

      <Modale
        titre="Confirmation requise"
        ouverte={confirmationRepartition !== null}
        onFermer={() => setConfirmationRepartition(null)}
      >
        <p className="flex items-start gap-2 text-sm text-brand-smooth">
          <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
          {confirmationRepartition}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmationRepartition(null)}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() => void appliquerRepartition(true)}
            className="btn btn-primaire"
          >
            Confirmer la répartition
          </button>
        </div>
      </Modale>
    </div>
  );
}

function formatLabel(cle: string, granularite: 'jour' | 'mois' | 'an'): string {
  if (granularite === 'an') return cle;
  const parts = cle.split("-");
  if (granularite === 'jour') {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString("fr-FR", { day: 'numeric', month: "short", timeZone: "UTC" });
  }
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}

function GraphiqueLigne({ donnees }: { donnees: { jour: {label: string, solde: number}[], mois: {label: string, solde: number}[], an: {label: string, solde: number}[] } }) {
  const [granularite, setGranularite] = useState<'jour' | 'mois' | 'an'>('mois');
  const series = donnees ? donnees[granularite] : [];

  if (!series || series.length === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune donnée pour cette période.</p>;
  }

  const largeur = 480;
  const hauteur = 180;
  const margeBas = 24;
  const margeHaut = 20;
  const valeurs = series.map((s) => s.solde);
  const minimum = Math.min(0, ...valeurs);
  const maximum = Math.max(1, ...valeurs);
  const pas = largeur / Math.max(1, series.length - 1);
  
  const y = (v: number) =>
    hauteur -
    margeBas -
    (maximum === minimum ? 0 : ((v - minimum) / (maximum - minimum)) * (hauteur - margeBas - margeHaut));
  
  const points = series.map((s, i) => `${i * pas},${y(s.solde)}`).join(" ");

  return (
    <div className="mt-3">
      <div className="flex justify-end gap-1 mb-2">
        <button
          type="button"
          onClick={() => setGranularite('jour')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'jour' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Jour
        </button>
        <button
          type="button"
          onClick={() => setGranularite('mois')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'mois' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Mois
        </button>
        <button
          type="button"
          onClick={() => setGranularite('an')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'an' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Année
        </button>
      </div>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="h-44 w-full min-w-[320px]" role="img">
          <polyline points={points} fill="none" stroke="#1770E5" strokeWidth={2.5} />
          {series.map((s, i) => {
            const isFirstOrLastOrMiddle = i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 5) === 0;
            return (
              <g key={s.label}>
                <circle cx={i * pas} cy={y(s.solde)} r={isFirstOrLastOrMiddle ? 3.5 : 2} fill="#1770E5" />
                {isFirstOrLastOrMiddle && (
                  <text x={i * pas} y={y(s.solde) - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={10} fill="#2E2D2D">
                    {formaterDA(s.solde)}
                  </text>
                )}
                {isFirstOrLastOrMiddle && (
                  <text x={i * pas} y={hauteur - 5} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={9} fill="#7C7572" transform={granularite === 'jour' && i !== 0 && i !== series.length - 1 ? `rotate(-45 ${i * pas} ${hauteur - 5})` : undefined}>
                    {formatLabel(s.label, granularite)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
