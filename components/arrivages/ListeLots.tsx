"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role, StatutLot } from "@prisma/client";
import Modale from "@/components/Modale";
import BadgeDescription from "@/components/BadgeDescription";
import { useToast } from "@/components/toast";
import { INFOS_STATUT_LOT } from "@/lib/statuts";
import { formaterDA } from "@/lib/caisse";
import { useLangue } from "@/lib/i18n/contexte";
import { IconeCorbeille, IconeCrayon, IconePlus } from "@/components/icons";

interface LigneLot {
  id: number;
  fournisseur: string;
  date_entree: string;
  statut_lot: StatutLot;
  description: string | null;
  cout_global_declare: number | null;
  quantite_attendue: number | null;
  mode_cout: "auto" | "manuel";
  cout_valide: boolean;
  cout_calcule: number;
  nb_produits: number;
  nb_testes: number;
  nb_recus: number;
}

export default function ListeLots({ role }: { role: Role }) {
  const router = useRouter();
  const { afficher } = useToast();
  const { langue, t } = useLangue();
  const [lots, setLots] = useState<LigneLot[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [rechercheFournisseur, setRechercheFournisseur] = useState("");
  const [triOrdre, setTriOrdre] = useState<"desc" | "asc">("desc");
  const [filtreStatut, setFiltreStatut] = useState<StatutLot | "tous">("tous");

  const [modalEdit, setModalEdit] = useState<LigneLot | null>(null);
  const [editFournisseur, setEditFournisseur] = useState("");
  const [editQuantite, setEditQuantite] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCout, setEditCout] = useState("");
  const [modalSuppr, setModalSuppr] = useState<LigneLot | null>(null);

  const estGerant = role === "gerant";

  const charger = useCallback(async () => {
    try {
      // `no-store` : le coût des lots « auto » est recalculé (Σ prix d'achat) à
      // chaque appel ; sans cela, le cache du navigateur pourrait figer un
      // ancien total après modification d'un prix produit dans le détail du lot.
      const res = await fetch("/api/lots", { cache: "no-store" });
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? t("listeLots.erreurChargement"));
      }
      const d = (await res.json()) as { lots: LigneLot[] };
      setLots(d.lots);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t("listeLots.erreurInattendue"));
    }
  }, [t]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Recharge à chaque retour sur la page (revenir du détail d'un lot après avoir
  // modifié un prix produit) pour refléter le coût recalculé du lot « auto ».
  useEffect(() => {
    function surRetour() {
      if (document.visibilityState === "visible") void charger();
    }
    window.addEventListener("focus", surRetour);
    document.addEventListener("visibilitychange", surRetour);
    return () => {
      window.removeEventListener("focus", surRetour);
      document.removeEventListener("visibilitychange", surRetour);
    };
  }, [charger]);

  function ouvrirEdition(lot: LigneLot) {
    setEditFournisseur(lot.fournisseur);
    setEditQuantite(lot.quantite_attendue !== null ? String(lot.quantite_attendue) : "");
    setEditDescription(lot.description ?? "");
    setEditCout(lot.cout_global_declare !== null ? String(lot.cout_global_declare) : "");
    setModalEdit(lot);
  }

  async function confirmerEdition() {
    if (!modalEdit) return;
    if (!editFournisseur.trim()) {
      afficher(t("listeLots.erreurFournisseur"), "erreur");
      return;
    }
    const quantite = Number(editQuantite);
    if (!editQuantite.trim() || !Number.isInteger(quantite) || quantite <= 0) {
      afficher(t("listeLots.erreurQuantite"), "erreur");
      return;
    }
    const donneesLot: Record<string, unknown> = {
      fournisseur: editFournisseur.trim(),
      quantite_attendue: quantite,
      description: editDescription.trim() || null,
    };
    if (estGerant) {
      if (editCout.trim()) {
        const cout = Number(editCout);
        if (!Number.isInteger(cout) || cout < 0) {
          afficher(t("listeLots.erreurCout"), "erreur");
          return;
        }
        donneesLot.cout_global_declare = cout;
      } else {
        donneesLot.cout_global_declare = null;
      }
    }
    setEnvoi(true);
    try {
      const res = await fetch(`/api/lots/${modalEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donneesLot),
      });
      const corps = (await res.json().catch(() => null)) as
        | { error?: string; correction_caisse?: number }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? t("listeLots.erreurModification"), "erreur");
        return;
      }
      const correction = corps?.correction_caisse;
      afficher(
        correction
          ? t("listeLots.modifieCaisse", {
              id: modalEdit.id,
              montant: `${correction > 0 ? "−" : "+"}${formaterDA(Math.abs(correction))}`,
            })
          : t("listeLots.modifie", { id: modalEdit.id })
      );
      setModalEdit(null);
      await charger();
    } catch {
      afficher(t("commun.serveurInjoignable"), "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function confirmerSuppression() {
    if (!modalSuppr) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/lots/${modalSuppr.id}`, { method: "DELETE" });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? t("listeLots.erreurSuppression"), "erreur");
        return;
      }
      afficher(t("listeLots.supprime", { id: modalSuppr.id }));
      setModalSuppr(null);
      await charger();
    } catch {
      afficher(t("commun.serveurInjoignable"), "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  const lotsFiltres = useMemo(() => {
    if (!lots) return null;
    let resultat = lots;

    if (rechercheFournisseur) {
      const q = rechercheFournisseur.toLowerCase();
      resultat = resultat.filter((l) => l.fournisseur.toLowerCase().includes(q));
    }

    if (filtreStatut !== "tous") {
      resultat = resultat.filter((l) => l.statut_lot === filtreStatut);
    }

    resultat = [...resultat].sort((a, b) => {
      const timeA = new Date(a.date_entree).getTime();
      const timeB = new Date(b.date_entree).getTime();
      return triOrdre === "desc" ? timeB - timeA : timeA - timeB;
    });

    return resultat;
  }, [lots, rechercheFournisseur, triOrdre, filtreStatut]);

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">{t("listeLots.titre")}</h1>
        {(role === "gerant" || role === "technicien") && (
          <Link href="/arrivages/nouveau" className="btn btn-primaire">
            <IconePlus taille={15} />
            {t("listeLots.nouveauLot")}
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-light-grey bg-brand-white p-4">
        <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-brand-warm-grey">{t("listeLots.filtreFournisseur")}</label>
          <input
            type="text"
            className="champ"
            placeholder={t("listeLots.rechercheFournisseur")}
            value={rechercheFournisseur}
            onChange={(e) => setRechercheFournisseur(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-warm-grey">{t("listeLots.filtreStatut")}</label>
          <select
            className="champ"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value as any)}
          >
            <option value="tous">{t("listeLots.tousStatuts")}</option>
            <option value="en_cours_de_test">{t("statutsLot.en_cours_de_test")}</option>
            <option value="teste">{t("statutsLot.teste")}</option>
            <option value="valide">{t("statutsLot.valide")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-warm-grey">{t("listeLots.triDate")}</label>
          <select
            className="champ"
            value={triOrdre}
            onChange={(e) => setTriOrdre(e.target.value as any)}
          >
            <option value="desc">{t("listeLots.triRecents")}</option>
            <option value="asc">{t("listeLots.triAnciens")}</option>
          </select>
        </div>
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}

      {!erreur && lots === null && (
        <p className="text-sm text-brand-warm-grey">{t("listeLots.chargement")}</p>
      )}

      {lots !== null && lotsFiltres?.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <p>{t("listeLots.aucunLot")}</p>
        </div>
      )}

      {lots !== null && lotsFiltres !== null && lotsFiltres.length > 0 && (
        <div className="space-y-4">
          {/* Vue Mobile: Cartes */}
          <div className="flex flex-col gap-3 md:hidden">
            {lotsFiltres.map((lot) => {
              const pct = lot.nb_produits > 0 ? Math.round((lot.nb_testes / lot.nb_produits) * 100) : 0;
              const infos = INFOS_STATUT_LOT[lot.statut_lot];
              return (
                <div
                  key={lot.id}
                  onClick={() => router.push(`/lots/${lot.id}`)}
                  className="flex flex-col gap-3 rounded-xl border border-brand-light-grey bg-brand-white p-4 shadow-sm cursor-pointer active:scale-[0.99] transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-brand-black">n°{lot.id}</span>
                      <span className="text-sm font-medium">{lot.fournisseur}</span>
                      {lot.description && (
                        <BadgeDescription description={lot.description} className="mt-1" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${infos.badge}`}>
                        {t(`statutsLot.${lot.statut_lot}`)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm border-t border-brand-light-grey/50 pt-2 mt-1">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-brand-warm-grey">{t("listeLots.colProduits")}</span>
                      <span className="font-bold text-brand-black">{lot.nb_produits} <span className="text-xs text-brand-grey font-normal">/ attendus {lot.quantite_attendue ?? 0}</span></span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-semibold text-brand-warm-grey">{t("listeLots.colCout")}</span>
                      <span className="font-semibold text-brand-black">
                        {lot.mode_cout === "auto"
                          ? formaterDA(lot.cout_calcule)
                          : lot.cout_global_declare !== null
                            ? formaterDA(lot.cout_global_declare)
                            : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-light-grey">
                        <div className="h-full rounded-full bg-brand-orange" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-brand-warm-grey">
                        {lot.nb_testes}/{lot.nb_produits} testés
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-brand-light-grey/50 pt-2 text-xs">
                    <span className="text-brand-warm-grey">{new Date(lot.date_entree).toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR")}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ouvrirEdition(lot);
                        }}
                        className="rounded-md p-1.5 text-brand-warm-grey bg-brand-light-grey/20 transition hover:bg-brand-light-grey hover:text-brand-black"
                      >
                        <IconeCrayon taille={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSuppr(lot);
                        }}
                        className="rounded-md p-1.5 text-danger bg-danger/10 transition hover:bg-danger/20"
                      >
                        <IconeCorbeille taille={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vue Bureau: Tableau */}
          <div className="hidden overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-brand-light-grey/25">
                <tr>
                  <th className="entete-table">{t("listeLots.colLot")}</th>
                  <th className="entete-table">{t("listeLots.colDate")}</th>
                  <th className="entete-table">{t("listeLots.colFournisseur")}</th>
                  <th className="entete-table text-right">{t("listeLots.colProduits")}</th>
                  <th className="entete-table text-right">{t("listeLots.colAttendus")}</th>
                  <th className="entete-table">{t("listeLots.colProgression")}</th>
                  <th className="entete-table">{t("listeLots.colStatut")}</th>
                  <th className="entete-table text-right">{t("listeLots.colCout")}</th>
                  <th className="entete-table" />
                </tr>
              </thead>
              <tbody className="">
                {lotsFiltres.map((lot) => {
                  const pct =
                    lot.nb_produits > 0 ? Math.round((lot.nb_testes / lot.nb_produits) * 100) : 0;
                  const infos = INFOS_STATUT_LOT[lot.statut_lot];
                  return (
                    <tr
                      key={lot.id}
                      onClick={() => router.push(`/lots/${lot.id}`)}
                      className="ligne-table border-b border-brand-light-grey/30 last:border-0 cursor-pointer"
                    >
                      <td className="px-3 py-2.5 font-bold">n°{lot.id}</td>
                      <td className="px-3 py-2.5">
                        {new Date(lot.date_entree).toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{lot.fournisseur}</div>
                        {lot.description && (
                          <BadgeDescription description={lot.description} className="mt-1" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold">{lot.nb_produits}</td>
                      <td className="px-3 py-2.5 text-right text-brand-warm-grey">{lot.quantite_attendue ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-brand-light-grey">
                            <div
                              className="h-full rounded-full bg-brand-orange"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-brand-warm-grey">
                            {t("listeLots.progressionTestes", { testes: lot.nb_testes, total: lot.nb_produits })}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${infos.badge}`}
                        >
                          {t(`statutsLot.${lot.statut_lot}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {lot.mode_cout === "auto"
                          ? formaterDA(lot.cout_calcule)
                          : lot.cout_global_declare !== null
                            ? formaterDA(lot.cout_global_declare)
                            : "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ouvrirEdition(lot);
                            }}
                            title={t("commun.modifier")}
                            aria-label={t("listeLots.modifierLot", { id: lot.id })}
                            className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                          >
                            <IconeCrayon taille={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalSuppr(lot);
                            }}
                            title={t("commun.supprimer")}
                            aria-label={t("listeLots.supprimerLot", { id: lot.id })}
                            className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                          >
                            <IconeCorbeille taille={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modale
        titre={modalEdit ? t("listeLots.modalEditTitre", { id: modalEdit.id }) : ""}
        ouverte={modalEdit !== null}
        onFermer={() => setModalEdit(null)}
      >
        <div className="space-y-3">
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-fournisseur">
              {t("formulaireLot.fournisseur")}
            </label>
            <input
              id="edit-fournisseur"
              type="text"
              value={editFournisseur}
              onChange={(e) => setEditFournisseur(e.target.value)}
              autoFocus
              className="champ"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-quantite">
              {t("listeLots.editQuantite")}
            </label>
            <input
              id="edit-quantite"
              type="number"
              min={1}
              step={1}
              value={editQuantite}
              onChange={(e) => setEditQuantite(e.target.value)}
              className="champ"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-desc-lot">
              {t("formulaireLot.description")}
            </label>
            <input
              id="edit-desc-lot"
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder={t("formulaireLot.descriptionPlaceholder")}
              className="champ"
            />
          </div>
          {estGerant ? (
            <div>
              <label className="libelle mb-1.5" htmlFor="edit-cout-lot">
                {t("listeLots.editCout")}
              </label>
              <input
                id="edit-cout-lot"
                type="number"
                min={0}
                step={1}
                value={editCout}
                onChange={(e) => setEditCout(e.target.value)}
                placeholder={t("listeLots.editCoutPlaceholder")}
                className="champ"
              />
              <p className="mt-1.5 text-xs text-brand-warm-grey">
                {t("listeLots.editCoutNote")}
              </p>
            </div>
          ) : (
            <p className="text-xs text-brand-warm-grey">
              {t("listeLots.editCoutNoteAutre")}
            </p>
          )}
          <div className="pt-1 text-right">
            <button
              type="button"
              disabled={envoi || !editFournisseur.trim() || !editQuantite.trim()}
              onClick={() => void confirmerEdition()}
              className="btn btn-primaire"
            >
              {t("commun.enregistrerModifications")}
            </button>
          </div>
        </div>
      </Modale>

      <Modale
        titre={modalSuppr ? t("listeLots.modalSupprTitre", { id: modalSuppr.id }) : ""}
        ouverte={modalSuppr !== null}
        onFermer={() => setModalSuppr(null)}
      >
        {modalSuppr && (
          <>
            <p className="text-sm text-brand-warm-grey">
              {t("listeLots.supprIntro")}{" "}
              <strong className="text-brand-black">{t("listeLots.lotNo", { id: modalSuppr.id })} — {modalSuppr.fournisseur}</strong>{" "}
              {t("listeLots.supprCorps", { n: modalSuppr.nb_produits })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalSuppr(null)}
                className="btn btn-secondaire"
              >
                {t("commun.annuler")}
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void confirmerSuppression()}
                className="btn btn-danger"
              >
                <IconeCorbeille taille={15} />
                {t("commun.supprimerDefinitivement")}
              </button>
            </div>
          </>
        )}
      </Modale>
    </div>
  );
}
