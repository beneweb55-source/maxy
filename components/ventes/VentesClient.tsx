"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import Modale from "@/components/Modale";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { IconeAlerte, IconeBillet } from "@/components/icons";

interface CarteEnVente {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  marge_prevue: number;
  jours_en_vente: number;
}

interface LigneVente {
  id: number;
  produit_id: number;
  code_interne: string;
  reference: string;
  prix_vente_reel: number;
  marge: number;
  canal: string | null;
  date_vente: string;
  vendeur: string;
  vendeur_id: number;
  annulee: boolean;
  motif_annulation: string | null;
}

interface ReponseHistorique {
  ventes: LigneVente[];
  vendeurs: { id: number; username: string }[];
  totaux: { nombre: number; chiffre_affaires: number; marge: number };
}

const CANAUX = ["Ouedkniss", "Facebook", "direct"];

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VentesClient({ role }: { role: Role }) {
  const { afficher } = useToast();
  const [onglet, setOnglet] = useState<"en_vente" | "historique">("en_vente");
  const [envoi, setEnvoi] = useState(false);

  const [cartes, setCartes] = useState<CarteEnVente[] | null>(null);
  const [erreurCartes, setErreurCartes] = useState<string | null>(null);
  const [modalVente, setModalVente] = useState<CarteEnVente | null>(null);
  const [prixReel, setPrixReel] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [avertissement, setAvertissement] = useState<string | null>(null);

  const [historique, setHistorique] = useState<ReponseHistorique | null>(null);
  const [erreurHistorique, setErreurHistorique] = useState<string | null>(null);
  const [filtreMois, setFiltreMois] = useState("");
  const [filtreVendeur, setFiltreVendeur] = useState("");
  const [modalAnnulation, setModalAnnulation] = useState<LigneVente | null>(null);
  const [motif, setMotif] = useState("");

  const peutVendre = role === "gerant" || role === "dev";
  const estGerant = role === "gerant";

  const chargerCartes = useCallback(async () => {
    try {
      const res = await fetch("/api/ventes/en-vente");
      const corps = (await res.json().catch(() => null)) as
        | { produits: CarteEnVente[] }
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreurCartes((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      setCartes((corps as { produits: CarteEnVente[] }).produits);
      setErreurCartes(null);
    } catch {
      setErreurCartes("Impossible de joindre le serveur.");
    }
  }, []);

  const chargerHistorique = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtreMois) params.set("mois", filtreMois);
      if (filtreVendeur) params.set("vendeur", filtreVendeur);
      const res = await fetch(`/api/ventes?${params.toString()}`);
      const corps = (await res.json().catch(() => null)) as
        | ReponseHistorique
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreurHistorique(
          (corps as { error?: string } | null)?.error ?? "Erreur de chargement."
        );
        return;
      }
      setHistorique(corps as ReponseHistorique);
      setErreurHistorique(null);
    } catch {
      setErreurHistorique("Impossible de joindre le serveur.");
    }
  }, [filtreMois, filtreVendeur]);

  useEffect(() => {
    void chargerCartes();
  }, [chargerCartes]);
  useEffect(() => {
    void chargerHistorique();
  }, [chargerHistorique]);

  function ouvrirVente(carte: CarteEnVente) {
    setPrixReel(carte.prix_vente_fixe !== null ? String(carte.prix_vente_fixe) : "");
    setCanal("");
    setDateVente(aujourdhuiIso());
    setAvertissement(null);
    setModalVente(carte);
  }

  async function enregistrerVente(confirmer: boolean) {
    if (!modalVente) return;
    setEnvoi(true);
    try {
      const res = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produit_id: modalVente.id,
          prix_vente_reel: Number(prixReel),
          canal: canal.trim() || undefined,
          date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
          confirmer: confirmer || undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la vente.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setAvertissement(corps.message ?? "Prix sous la marge minimum. Confirmer ?");
        return;
      }
      afficher(
        `Vente enregistrée : ${modalVente.reference} — ${formaterDA(Number(prixReel))}. Imed a été notifié.`
      );
      setModalVente(null);
      await Promise.all([chargerCartes(), chargerHistorique()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function annulerVente() {
    if (!modalAnnulation) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/ventes/${modalAnnulation.id}/annulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'annulation.", "erreur");
        return;
      }
      afficher("Vente annulée — caisse contre-passée, produit remis en vente.");
      setModalAnnulation(null);
      setMotif("");
      await Promise.all([chargerCartes(), chargerHistorique()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1>Ventes</h1>

      <div className="flex gap-1 border-b border-brand-light-grey">
        {(
          [
            ["en_vente", `En vente${cartes ? ` (${cartes.length})` : ""}`],
            ["historique", "Historique"],
          ] as const
        ).map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => setOnglet(cle)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition ${
              onglet === cle
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-brand-warm-grey hover:text-brand-black"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === "en_vente" && (
        <div>
          {erreurCartes && (
            <div className="alerte-erreur" role="alert">
              {erreurCartes}
            </div>
          )}
          {!erreurCartes && cartes === null && (
            <p className="text-sm text-brand-warm-grey">Chargement…</p>
          )}
          {cartes !== null && cartes.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucun produit en vente. Le gérant fixe les prix des produits « OK » pour les mettre
              en vente.
            </p>
          )}
          {cartes !== null && cartes.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cartes.map((c) => (
                <li key={c.id} className="carte flex flex-col">
                  <Link
                    href={`/produits/${c.id}`}
                    className="block truncate text-sm font-semibold transition hover:text-brand-crystal hover:underline"
                    title={c.reference}
                  >
                    <span className="font-mono text-xs text-brand-warm-grey">
                      {c.code_interne}
                    </span>{" "}
                    {c.reference}
                  </Link>
                  <p className="mt-1 text-xs text-brand-warm-grey">{c.categorie}</p>
                  <dl className="mt-2 flex-1 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-brand-warm-grey">Prix fixé</dt>
                      <dd className="font-bold">
                        {c.prix_vente_fixe !== null ? formaterDA(c.prix_vente_fixe) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-brand-warm-grey">Marge prévue</dt>
                      <dd
                        className={`font-semibold ${c.marge_prevue >= 0 ? "text-succes" : "text-danger"}`}
                      >
                        {formaterDA(c.marge_prevue)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-brand-warm-grey">En vente depuis</dt>
                      <dd>{c.jours_en_vente} j</dd>
                    </div>
                  </dl>
                  {peutVendre && (
                    <button
                      type="button"
                      onClick={() => ouvrirVente(c)}
                      className="btn btn-primaire mt-3 w-full"
                    >
                      <IconeBillet taille={15} />
                      Vendre
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {onglet === "historique" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={filtreMois}
              onChange={(e) => setFiltreMois(e.target.value)}
              className="champ w-auto"
            />
            <select
              value={filtreVendeur}
              onChange={(e) => setFiltreVendeur(e.target.value)}
              className="champ w-auto"
            >
              <option value="">Tous les vendeurs</option>
              {(historique?.vendeurs ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.username}
                </option>
              ))}
            </select>
            {(filtreMois || filtreVendeur) && (
              <button
                type="button"
                onClick={() => {
                  setFiltreMois("");
                  setFiltreVendeur("");
                }}
                className="text-sm text-brand-warm-grey hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {historique && (
            <p className="text-sm text-brand-warm-grey">
              <strong className="text-brand-black">{historique.totaux.nombre}</strong> vente
              {historique.totaux.nombre > 1 ? "s" : ""} valide
              {historique.totaux.nombre > 1 ? "s" : ""} · CA{" "}
              <strong className="text-brand-black">
                {formaterDA(historique.totaux.chiffre_affaires)}
              </strong>{" "}
              · marge totale{" "}
              <strong
                className={historique.totaux.marge >= 0 ? "text-succes" : "text-danger"}
              >
                {formaterDA(historique.totaux.marge)}
              </strong>
            </p>
          )}

          {erreurHistorique && (
            <div className="alerte-erreur" role="alert">
              {erreurHistorique}
            </div>
          )}
          {!erreurHistorique && historique === null && (
            <p className="text-sm text-brand-warm-grey">Chargement…</p>
          )}
          {historique && historique.ventes.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucune vente pour ces filtres.
            </p>
          )}

          {historique && historique.ventes.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-brand-light-grey/25">
                  <tr>
                    <th className="entete-table">Produit</th>
                    <th className="entete-table text-right">Prix</th>
                    <th className="entete-table text-right">Marge</th>
                    <th className="entete-table">Canal</th>
                    <th className="entete-table">Vendeur</th>
                    <th className="entete-table text-right">Date</th>
                    {estGerant && <th className="entete-table" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-light-grey/50">
                  {historique.ventes.map((v) => (
                    <tr key={v.id} className={v.annulee ? "text-brand-grey" : ""}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/produits/${v.produit_id}`}
                          className={`hover:underline ${v.annulee ? "line-through" : ""}`}
                        >
                          <span className="font-mono text-xs text-brand-grey">
                            {v.code_interne}
                          </span>{" "}
                          {v.reference}
                        </Link>
                        {v.annulee && (
                          <span
                            className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-xs font-semibold text-danger"
                            title={v.motif_annulation ?? undefined}
                          >
                            annulée
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{formaterDA(v.prix_vente_reel)}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          v.annulee ? "" : v.marge >= 0 ? "text-succes" : "text-danger"
                        }`}
                      >
                        {formaterDA(v.marge)}
                      </td>
                      <td className="px-3 py-2">{v.canal ?? "—"}</td>
                      <td className="px-3 py-2">{v.vendeur}</td>
                      <td className="px-3 py-2 text-right">
                        {new Date(v.date_vente).toLocaleDateString("fr-FR")}
                      </td>
                      {estGerant && (
                        <td className="px-3 py-2 text-right">
                          {!v.annulee && (
                            <button
                              type="button"
                              onClick={() => {
                                setMotif("");
                                setModalAnnulation(v);
                              }}
                              className="text-xs font-semibold text-danger hover:underline"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modale
        titre={modalVente ? `Vendre — ${modalVente.code_interne}` : ""}
        ouverte={modalVente !== null}
        onFermer={() => setModalVente(null)}
      >
        {modalVente && (
          <div className="space-y-3">
            <p className="text-sm text-brand-warm-grey">{modalVente.reference}</p>
            <div>
              <label className="libelle mb-1.5" htmlFor="prix-reel">
                Prix de vente réel (DA) *
              </label>
              <input
                id="prix-reel"
                type="number"
                min={1}
                step={1}
                value={prixReel}
                onChange={(e) => {
                  setPrixReel(e.target.value);
                  setAvertissement(null);
                }}
                autoFocus
                className="champ"
              />
              {Number(prixReel) > 0 && (
                <p className="mt-1 text-xs">
                  Marge :{" "}
                  <strong
                    className={
                      Number(prixReel) - modalVente.prix_achat - modalVente.cout_reparations >= 0
                        ? "text-succes"
                        : "text-danger"
                    }
                  >
                    {formaterDA(
                      Number(prixReel) - modalVente.prix_achat - modalVente.cout_reparations
                    )}
                  </strong>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="date-vente">
                  Date
                </label>
                <input
                  id="date-vente"
                  type="date"
                  value={dateVente}
                  max={aujourdhuiIso()}
                  onChange={(e) => setDateVente(e.target.value)}
                  className="champ"
                />
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="canal">
                  Canal
                </label>
                <input
                  id="canal"
                  type="text"
                  list="canaux"
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  placeholder="Ouedkniss…"
                  className="champ"
                />
                <datalist id="canaux">
                  {CANAUX.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {avertissement && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-glow/40 px-3 py-2 text-sm text-brand-smooth">
                <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
                {avertissement}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {avertissement ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAvertissement(null)}
                    className="btn btn-secondaire"
                  >
                    Revoir le prix
                  </button>
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => void enregistrerVente(true)}
                    className="btn btn-primaire"
                  >
                    Vendre quand même
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={envoi || !prixReel.trim()}
                  onClick={() => void enregistrerVente(false)}
                  className="btn btn-primaire"
                >
                  Enregistrer la vente
                </button>
              )}
            </div>
          </div>
        )}
      </Modale>

      <Modale
        titre={modalAnnulation ? `Annuler la vente — ${modalAnnulation.code_interne}` : ""}
        ouverte={modalAnnulation !== null}
        onFermer={() => setModalAnnulation(null)}
      >
        <p className="text-sm text-brand-warm-grey">
          La caisse sera contre-passée et le produit remis en vente. La ligne de vente reste dans
          l'historique (rien ne se supprime).
        </p>
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Motif de l'annulation (obligatoire)"
          className="champ mt-3"
        />
        <div className="mt-3 text-right">
          <button
            type="button"
            disabled={envoi || !motif.trim()}
            onClick={() => void annulerVente()}
            className="btn btn-danger"
          >
            Annuler la vente
          </button>
        </div>
      </Modale>
    </div>
  );
}
