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
import { IconeCorbeille, IconeCrayon, IconePlus } from "@/components/icons";

interface LigneLot {
  id: number;
  fournisseur: string;
  date_entree: string;
  statut_lot: StatutLot;
  description: string | null;
  cout_global_declare: number | null;
  quantite_attendue: number | null;
  nb_produits: number;
  nb_testes: number;
  nb_recus: number;
}

export default function ListeLots({ role }: { role: Role }) {
  const router = useRouter();
  const { afficher } = useToast();
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
      const res = await fetch("/api/lots");
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement des lots.");
      }
      const d = (await res.json()) as { lots: LigneLot[] };
      setLots(d.lots);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, []);

  useEffect(() => {
    void charger();
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
      afficher("Le fournisseur est obligatoire.", "erreur");
      return;
    }
    const quantite = Number(editQuantite);
    if (!editQuantite.trim() || !Number.isInteger(quantite) || quantite <= 0) {
      afficher("La quantité attendue doit être un entier strictement positif.", "erreur");
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
          afficher("Le coût global déclaré doit être un entier positif en DA.", "erreur");
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
        afficher(corps?.error ?? "Erreur lors de la modification du lot.", "erreur");
        return;
      }
      const correction = corps?.correction_caisse;
      afficher(
        correction
          ? `Lot n°${modalEdit.id} modifié — caisse ajustée de ${correction > 0 ? "−" : "+"}${formaterDA(Math.abs(correction))}.`
          : `Lot n°${modalEdit.id} modifié.`
      );
      setModalEdit(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
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
        afficher(corps?.error ?? "Erreur lors de la suppression du lot.", "erreur");
        return;
      }
      afficher(`Lot n°${modalSuppr.id} supprimé.`);
      setModalSuppr(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
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
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Arrivages</h1>
        {role === "gerant" && (
          <Link href="/arrivages/nouveau" className="btn btn-primaire">
            <IconePlus taille={15} />
            Nouveau lot
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-light-grey bg-brand-white p-4">
        <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-brand-warm-grey">Fournisseur</label>
          <input
            type="text"
            className="champ"
            placeholder="Rechercher un fournisseur..."
            value={rechercheFournisseur}
            onChange={(e) => setRechercheFournisseur(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-warm-grey">Statut</label>
          <select
            className="champ"
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value as any)}
          >
            <option value="tous">Tous les statuts</option>
            <option value="en_cours_de_test">En cours de test</option>
            <option value="teste">Testé</option>
            <option value="valide">Validé</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-warm-grey">Tri par date</label>
          <select
            className="champ"
            value={triOrdre}
            onChange={(e) => setTriOrdre(e.target.value as any)}
          >
            <option value="desc">Plus récents d'abord</option>
            <option value="asc">Plus anciens d'abord</option>
          </select>
        </div>
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}

      {!erreur && lots === null && (
        <p className="text-sm text-brand-warm-grey">Chargement des lots…</p>
      )}

      {lots !== null && lotsFiltres?.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <p>Aucun lot ne correspond aux critères.</p>
        </div>
      )}

      {lots !== null && lotsFiltres !== null && lotsFiltres.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-brand-light-grey/25">
              <tr>
                <th className="entete-table">Lot</th>
                <th className="entete-table">Date</th>
                <th className="entete-table">Fournisseur</th>
                <th className="entete-table text-right">Produits</th>
                <th className="entete-table text-right">Attendus</th>
                <th className="entete-table">Progression</th>
                <th className="entete-table">Statut</th>
                <th className="entete-table text-right">Coût déclaré</th>
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
                      {new Date(lot.date_entree).toLocaleDateString("fr-FR")}
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
                          {lot.nb_testes}/{lot.nb_produits} testés
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${infos.badge}`}
                      >
                        {infos.libelle}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {lot.cout_global_declare !== null
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
                          title="Modifier"
                          aria-label={`Modifier le lot n°${lot.id}`}
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
                          title="Supprimer"
                          aria-label={`Supprimer le lot n°${lot.id}`}
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
      )}

      <Modale
        titre={modalEdit ? `Modifier le lot n°${modalEdit.id}` : ""}
        ouverte={modalEdit !== null}
        onFermer={() => setModalEdit(null)}
      >
        <div className="space-y-3">
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-fournisseur">
              Fournisseur *
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
              Quantité attendue *
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
              Description
            </label>
            <input
              id="edit-desc-lot"
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Ex. Lot mixte bureautique"
              className="champ"
            />
          </div>
          {estGerant ? (
            <div>
              <label className="libelle mb-1.5" htmlFor="edit-cout-lot">
                Coût global déclaré (DA)
              </label>
              <input
                id="edit-cout-lot"
                type="number"
                min={0}
                step={1}
                value={editCout}
                onChange={(e) => setEditCout(e.target.value)}
                placeholder="Laisser vide si non déclaré"
                className="champ"
              />
              <p className="mt-1.5 text-xs text-brand-warm-grey">
                Corriger ce montant crée un mouvement d'ajustement tracé en caisse pour l'écart —
                l'historique n'est jamais réécrit.
              </p>
            </div>
          ) : (
            <p className="text-xs text-brand-warm-grey">
              Le coût global déclaré est lié à la caisse ; seul le gérant peut le corriger.
            </p>
          )}
          <div className="pt-1 text-right">
            <button
              type="button"
              disabled={envoi || !editFournisseur.trim() || !editQuantite.trim()}
              onClick={() => void confirmerEdition()}
              className="btn btn-primaire"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </Modale>

      <Modale
        titre={modalSuppr ? `Supprimer le lot n°${modalSuppr.id}` : ""}
        ouverte={modalSuppr !== null}
        onFermer={() => setModalSuppr(null)}
      >
        {modalSuppr && (
          <>
            <p className="text-sm text-brand-warm-grey">
              Le lot <strong className="text-brand-black">n°{modalSuppr.id} — {modalSuppr.fournisseur}</strong>{" "}
              et ses {modalSuppr.nb_produits} produit{modalSuppr.nb_produits > 1 ? "s" : ""} seront
              définitivement supprimés. Un lot ayant un historique de caisse (coût déclaré, réparation
              ou vente) ne peut pas être supprimé. Cette action est irréversible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalSuppr(null)}
                className="btn btn-secondaire"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void confirmerSuppression()}
                className="btn btn-danger"
              >
                <IconeCorbeille taille={15} />
                Supprimer définitivement
              </button>
            </div>
          </>
        )}
      </Modale>
    </div>
  );
}
