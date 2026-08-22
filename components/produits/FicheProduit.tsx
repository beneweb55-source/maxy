"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/contexte";
import type { DecisionRapport, Role, StatutLot, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import ChampPhotos from "@/components/ChampPhotos";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT } from "@/lib/statuts";
import {
  PLACEHOLDERS_NOTE,
  STATUTS_NOTE_OBLIGATOIRE,
  TRANSITIONS_MANUELLES,
} from "@/lib/transitions";
import {
  ICONES_STATUT,
  IconeBillet,
  IconeCorbeille,
  IconeCrayon,
  IconeEtiquette,
  IconeFlecheGauche,
  IconeFlecheDroite,
  IconeNote,
  IconePlus,
  IconeTelechargement,
  IconeVitrine,
} from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";
import { useBrouillon } from "@/hooks/useBrouillon";

interface ProduitDto {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  notes: string | null;
  image_url: string | null;
  images: string[];
  en_vitrine: boolean;
  etiquette_imprimee: boolean;
  decision_rapport: DecisionRapport | null;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  date_vente: string | null;
  quantite: number;
  ids_modele: number[];
  marge: number | null;
  jours_stock: number;
  date_entree: string;
  lot: { id: number; fournisseur: string; date_entree: string; statut_lot: StatutLot } | null;
  reparations: { id: number; cout: number; description: string; date: string; par: string }[];
  historique: {
    id: number;
    statut_avant: StatutProduit | null;
    statut_apres: StatutProduit;
    note: string | null;
    quand: string;
    par: string;
  }[];
  ventes: {
    id: number;
    prix_vente_reel: number;
    canal: string | null;
    date_vente: string;
    vendeur: string;
    annulee: boolean;
    motif_annulation: string | null;
  }[];
}

export default function FicheProduit({
  produitId,
  role,
}: {
  produitId: number;
  role: Role;
}) {
  const router = useRouter();
  const { afficher } = useToast();
  const t = useT();
  const [produit, setProduit] = useState<ProduitDto | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [notes, setNotes] = useState("");
  const [modalNote, setModalNote] = useState<StatutProduit | null>(null);
  const [noteTexte, setNoteTexte] = useState("");
  const [modalPrix, setModalPrix] = useState(false);
  const [prixTexte, setPrixTexte] = useState("");
  const [modalReparation, setModalReparation] = useState(false);
  const [coutReparation, setCoutReparation] = useState("");
  const [descReparation, setDescReparation] = useState("");
  const [modalEdition, setModalEdition] = useState(false);
  
  const {
    valeur: edition,
    setValeur: setEdition,
    isDirty: editionModifiee,
    brouillonDisponible,
    restaurerBrouillon,
    supprimerBrouillon,
    validerEtVider: validerEdition
  } = useBrouillon(
    produit ? `produit-edit-fiche-${produit.id}` : "",
    produit ? {
      reference: produit.reference,
      categorie: produit.categorie,
      prix_achat: String(produit.prix_achat),
      quantite: String(produit.quantite),
    } : { reference: "", categorie: "", prix_achat: "", quantite: "1" },
    modalEdition
  );

  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPhotosModifiees, setEditPhotosModifiees] = useState(false);
  const [modalSuppression, setModalSuppression] = useState(false);
  const [indexActif, setIndexActif] = useState(0);
  const [visionneuseOuverte, setVisionneuseOuverte] = useState(false);

  const peutModifierStatut = role === "technicien" || role === "gerant";
  const estGerant = role === "gerant";
  const peutVendre = role === "gerant" || role === "dev" || role === "social_media";
  const estSocial = role === "social_media";

  const rafraichir = useCallback(async () => {
    try {
      const res = await fetch(`/api/produits/${produitId}`);
      const corps = (await res.json().catch(() => null)) as
        | ProduitDto
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      const p = corps as ProduitDto;
      setProduit(p);
      setNotes(p.notes ?? "");
      setIndexActif(0);
      setErreur(null);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [produitId]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  async function appel(
    url: string,
    methode: string,
    corps: unknown
  ): Promise<boolean> {
    setEnvoi(true);
    try {
      const res = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: corps === undefined ? undefined : JSON.stringify(corps),
      });
      const reponse = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(reponse?.error ?? "Erreur lors de l'opération.", "erreur");
        return false;
      }
      return true;
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
      return false;
    } finally {
      setEnvoi(false);
    }
  }



  if (erreur && !produit) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}{" "}
        <Link href="/inventaire" className="underline">
          Retour à l'inventaire
        </Link>
      </div>
    );
  }
  if (!produit) return <p className="p-4 text-sm text-brand-warm-grey">{t("ficheProduit.chargement")}</p>;

  const cibles = peutModifierStatut ? (TRANSITIONS_MANUELLES[produit.statut] ?? []) : [];
  const vendu = produit.statut === "vendu";
  const montrerActions = !vendu;

  function demanderTransition(cible: StatutProduit) {
    if (STATUTS_NOTE_OBLIGATOIRE.includes(cible)) {
      setNoteTexte("");
      setModalNote(cible);
      return;
    }
    void appel(`/api/produits/${produitId}/statut`, "POST", { statut: cible }).then((ok) => {
      if (ok) {
        afficher(`Statut → ${INFOS_STATUT[cible].libelle}`);
        void rafraichir();
      }
    });
  }

  function ouvrirEdition() {
    if (!produit) return;
    setEditPhotos(produit.images);
    setEditPhotosModifiees(false);
    setModalEdition(true);
  }

  function basculerVitrine() {
    if (!produit) return;
    const cible = !produit.en_vitrine;
    void appel(`/api/produits/${produitId}`, "PUT", { en_vitrine: cible }).then((ok) => {
      if (ok) {
        afficher(cible ? "Produit mis en vitrine." : "Produit retiré de la vitrine.");
        void rafraichir();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">
          <span className="font-mono text-xl text-brand-warm-grey">{produit.code_interne}</span>{" "}
          {produit.reference}
        </h1>
        <Link href="/inventaire" className="lien inline-flex items-center gap-1.5 text-sm">
          <IconeFlecheGauche taille={14} />
          Inventaire
        </Link>
      </div>

      {vendu && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-smooth px-4 py-2.5 text-sm text-brand-white">
          <IconeBillet taille={16} />
          Produit vendu — fiche verrouillée (seules les notes restent modifiables).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="carte">
          <h2 className="libelle text-brand-smooth">{t("ficheProduit.identite")}</h2>
          {produit.images.length > 0 && (
            <div className="mt-2.5 space-y-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVisionneuseOuverte(true)}
                  title="Voir la photo en grand"
                  aria-label="Voir la photo en grand"
                  className="block w-full cursor-zoom-in"
                >
                  <img
                    src={produit.images[indexActif] ?? produit.images[0]}
                    alt={`Photo de ${produit.reference}`}
                    className="h-52 w-full rounded-lg border border-brand-light-grey object-cover"
                  />
                </button>
                {produit.en_vitrine && (
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-brand-white shadow">
                    <IconeVitrine taille={12} />
                    En vitrine
                  </span>
                )}
                {produit.images.length > 1 && (
                  <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {indexActif + 1} / {produit.images.length}
                  </span>
                )}
                <a
                  href={`${produit.images[indexActif] ?? produit.images[0]}?download=1`}
                  onClick={(e) => e.stopPropagation()}
                  title="Télécharger la photo affichée"
                  aria-label="Télécharger la photo affichée"
                  className="absolute bottom-2 right-2 rounded-full bg-black/55 p-2 text-white shadow transition hover:bg-black/75"
                >
                  <IconeTelechargement taille={15} />
                </a>
              </div>
              {produit.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {produit.images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndexActif(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === indexActif
                          ? "border-brand-orange"
                          : "border-brand-light-grey hover:border-brand-grey"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {produit.images.length > 1 && (
                <a
                  href={`/api/produits/${produitId}/images/export`}
                  className="btn btn-secondaire w-full justify-center"
                  title="Télécharger toutes les photos de ce produit (ZIP)"
                >
                  <IconeTelechargement taille={15} />
                  Tout télécharger ({produit.images.length} photos)
                </a>
              )}
            </div>
          )}
          <dl className="mt-2.5 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("inventaire.statut")}</dt>
              <dd>
                <BadgeStatut statut={produit.statut} />
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("ficheProduit.vitrine")}</dt>
              <dd className="font-semibold">
                {produit.en_vitrine ? (
                  <span className="inline-flex items-center gap-1 text-brand-orange">
                    <IconeVitrine taille={13} /> {t("ficheProduit.expose")}
                  </span>
                ) : (
                  <span className="text-brand-grey">{t("ficheProduit.nonExpose")}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("inventaire.colCategorie")}</dt>
              <dd className="font-semibold">{produit.categorie}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("ficheProduit.lotOrigine")}</dt>
              <dd>
                {produit.lot ? (
                  <Link href={`/lots/${produit.lot.id}`} className="lien">
                    n°{produit.lot.id} — {produit.lot.fournisseur}
                  </Link>
                ) : (
                  <span className="text-brand-grey">{t("ficheProduit.ajoutDirect")}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("ficheProduit.dateEntree")}</dt>
              <dd>
                {new Date(produit.lot?.date_entree ?? produit.date_entree).toLocaleDateString(
                  "fr-FR"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("ficheProduit.joursEnStock")}</dt>
              <dd
                className={
                  produit.jours_stock > 30 && !vendu ? "font-bold text-brand-orange" : ""
                }
              >
                {produit.jours_stock} jour{produit.jours_stock > 1 ? "s" : ""}
              </dd>
            </div>
            {produit.decision_rapport && (
              <div className="flex justify-between gap-2">
                <dt className="text-brand-warm-grey">{t("ficheProduit.decisionRapport")}</dt>
                <dd className="font-semibold">
                  {produit.decision_rapport === "reparer"
                    ? "Réparer"
                    : produit.decision_rapport === "vendre_en_etat"
                      ? "Vendre en l'état"
                      : "Pièces détachées"}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="carte">
          <h2 className="libelle text-brand-smooth">{t("ficheProduit.finances")}</h2>
          <dl className="mt-2.5 space-y-1.5 text-sm">
            {!estSocial && (
              <>
                <div className="flex justify-between gap-2">
                  <dt className="text-brand-warm-grey">{t("ficheProduit.prixAchat")}</dt>
                  <dd className="font-semibold">{formaterDA(produit.prix_achat)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-brand-warm-grey">{t("ficheProduit.totalReparations")}</dt>
                  <dd className="font-semibold">
                    {produit.cout_reparations > 0 ? formaterDA(produit.cout_reparations) : "—"}
                  </dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("ficheProduit.prixVenteFixe")}</dt>
              <dd className="font-semibold">
                {produit.prix_vente_fixe !== null ? formaterDA(produit.prix_vente_fixe) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-brand-warm-grey">{t("ficheProduit.prixVenteReel")}</dt>
              <dd className="font-semibold">
                {produit.prix_vente_reel !== null ? formaterDA(produit.prix_vente_reel) : "—"}
              </dd>
            </div>
            {!estSocial && (
              <div className="flex justify-between gap-2 border-t border-brand-light-grey/70 pt-1.5">
                <dt className="text-brand-warm-grey">{t("ficheProduit.marge")}</dt>
                <dd
                  className={`font-bold ${
                    produit.marge === null
                      ? "text-brand-grey"
                      : produit.marge >= 0
                        ? "text-succes"
                        : "text-danger"
                  }`}
                >
                  {produit.marge !== null ? formaterDA(produit.marge) : "— (pas encore vendu)"}
                </dd>
              </div>
            )}
          </dl>

          {!estSocial && produit.reparations.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-lg bg-brand-light-grey/25 p-2.5 text-xs text-brand-smooth">
              {produit.reparations.map((r) => (
                <li key={r.id}>
                  {new Date(r.date).toLocaleDateString("fr-FR")} — {r.description} ·{" "}
                  <strong>{formaterDA(r.cout)}</strong> ({r.par})
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {montrerActions && (
        <section className="carte">
          <h2 className="libelle text-brand-smooth">{t("ficheProduit.actions")}</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {cibles.map((cible) => {
              const Icone = ICONES_STATUT[cible];
              return (
                <button
                  key={cible}
                  type="button"
                  disabled={envoi}
                  onClick={() => demanderTransition(cible)}
                  className="btn btn-secondaire"
                >
                  <Icone taille={14} />
                  {INFOS_STATUT[cible].libelle}
                </button>
              );
            })}
            {estGerant && produit.statut === "ok" && (
              <button
                type="button"
                disabled={envoi}
                onClick={() => {
                  setPrixTexte("");
                  setModalPrix(true);
                }}
                className="btn btn-primaire"
              >
                <IconeEtiquette taille={14} />
                Fixer le prix — mettre en vente
              </button>
            )}
            {peutVendre && produit.statut === "en_vente" && (
              <Link href={`/caisse?produit=${produit.code_interne}`} className="btn btn-crystal">
                Vendre ce produit
                <IconeFlecheDroite taille={14} />
              </Link>
            )}
            {peutModifierStatut && (
              <button
                type="button"
                disabled={envoi}
                onClick={() => setModalReparation(true)}
                className="btn border border-dashed border-brand-grey bg-brand-white text-brand-warm-grey hover:bg-brand-light-grey/25"
              >
                <IconePlus taille={14} />
                Réparation
              </button>
            )}
            {(role === "gerant" || role === "technicien" || role === "dev") && (
              <button
                type="button"
                disabled={envoi}
                onClick={basculerVitrine}
                title="Exposition physique en vitrine — indépendante de la mise en vente en ligne"
                className={
                  produit.en_vitrine
                    ? "btn bg-brand-orange text-brand-white hover:bg-brand-orange/90"
                    : "btn btn-secondaire"
                }
              >
                <IconeVitrine taille={14} />
                {produit.en_vitrine ? "Retirer de la vitrine" : "Mettre en vitrine"}
              </button>
            )}
            <BoutonImpression 
              ids={[produit.id]} 
              dejaImprimee={produit.etiquette_imprimee} 
              className="btn btn-secondaire" 
              texte="Imprimer l'étiquette"
            />
            {!vendu && (
              <>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={ouvrirEdition}
                  className="btn btn-secondaire"
                >
                  <IconeCrayon taille={14} />
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => setModalSuppression(true)}
                  className="btn border border-danger/30 bg-brand-white text-danger hover:bg-danger/10"
                >
                  <IconeCorbeille taille={14} />
                  Supprimer
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {produit.ventes.length > 0 && (
        <section className="carte">
          <h2 className="libelle text-brand-smooth">{t("ficheProduit.ventes")}</h2>
          <ul className="mt-2.5 text-sm">
            {produit.ventes.map((v) => (
              <li key={v.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0 flex items-center justify-between py-2 px-1">
                <span className={v.annulee ? "text-brand-grey line-through" : ""}>
                  {new Date(v.date_vente).toLocaleDateString("fr-FR")} —{" "}
                  {formaterDA(v.prix_vente_reel)}
                  {v.canal ? ` (${v.canal})` : ""} · {v.vendeur}
                </span>
                {v.annulee && (
                  <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger">
                    annulée{v.motif_annulation ? ` — ${v.motif_annulation}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="carte">
        <h2 className="libelle text-brand-smooth">{t("ficheProduit.historiqueComplet")}</h2>
        <ol className="mt-3 space-y-0">
          {produit.historique.map((h, i) => (
            <li key={h.id} className="relative flex gap-3 pb-4">
              {i < produit.historique.length - 1 && (
                <span className="absolute left-[7px] top-5 h-full w-px bg-brand-light-grey" />
              )}
              <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-white bg-brand-orange ring-1 ring-brand-light-grey" />
              <div className="min-w-0 text-sm">
                <p>
                  {h.statut_avant === null ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      Création
                      <IconeFlecheDroite taille={12} className="text-brand-grey" />
                      <BadgeStatut statut={h.statut_apres} />
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <BadgeStatut statut={h.statut_avant} />
                      <IconeFlecheDroite taille={12} className="text-brand-grey" />
                      <BadgeStatut statut={h.statut_apres} />
                    </span>
                  )}
                </p>
                {h.note && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-brand-smooth">
                    <IconeNote taille={13} className="mt-0.5 shrink-0 text-brand-warm-grey" />
                    {h.note}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-brand-grey">
                  par {h.par} ·{" "}
                  {new Date(h.quand).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="carte">
        <h2 className="libelle text-brand-smooth">{t("ficheProduit.notesLibres")}</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ajouter une note libre…"
          className="champ mt-2.5"
        />
        <div className="mt-2 text-right">
          <button
            type="button"
            disabled={envoi || notes === (produit.notes ?? "")}
            onClick={() =>
              void appel(`/api/produits/${produitId}/notes`, "PATCH", { notes }).then((ok) => {
                if (ok) {
                  afficher("Note enregistrée.");
                  void rafraichir();
                }
              })
            }
            className="btn btn-primaire"
          >
            Enregistrer la note
          </button>
        </div>
      </section>

      <Modale
        titre={modalNote ? `Passage en « ${INFOS_STATUT[modalNote].libelle} »` : ""}
        ouverte={modalNote !== null}
        onFermer={() => setModalNote(null)}
      >
        <textarea
          value={noteTexte}
          onChange={(e) => setNoteTexte(e.target.value)}
          rows={3}
          autoFocus
          placeholder={modalNote ? PLACEHOLDERS_NOTE[modalNote] : ""}
          className="champ"
        />
        <div className="mt-3 text-right">
          <button
            type="button"
            disabled={!noteTexte.trim() || envoi}
            onClick={() => {
              if (!modalNote) return;
              void appel(`/api/produits/${produitId}/statut`, "POST", {
                statut: modalNote,
                note: noteTexte,
              }).then((ok) => {
                if (ok) {
                  afficher(`Statut → ${INFOS_STATUT[modalNote].libelle}`);
                  setModalNote(null);
                  void rafraichir();
                }
              });
            }}
            className="btn btn-primaire"
          >
            Confirmer le changement
          </button>
        </div>
      </Modale>

      <Modale
        titre="Fixer le prix de vente"
        ouverte={modalPrix}
        onFermer={() => setModalPrix(false)}
      >
        <p className="text-sm text-brand-warm-grey">
          Coût total :{" "}
          <strong className="text-brand-black">
            {formaterDA(produit.prix_achat + produit.cout_reparations)}
          </strong>{" "}
          (achat {formaterDA(produit.prix_achat)}
          {produit.cout_reparations > 0 &&
            ` + réparations ${formaterDA(produit.cout_reparations)}`}
          )
        </p>
        <input
          type="number"
          min={1}
          step={1}
          value={prixTexte}
          onChange={(e) => setPrixTexte(e.target.value)}
          autoFocus
          placeholder="Prix de vente (DA)"
          className="champ mt-3"
        />
        {Number(prixTexte) > 0 && (
          <p className="mt-2 text-sm">
            Marge prévue :{" "}
            <strong
              className={
                Number(prixTexte) - produit.prix_achat - produit.cout_reparations >= 0
                  ? "text-succes"
                  : "text-danger"
              }
            >
              {formaterDA(Number(prixTexte) - produit.prix_achat - produit.cout_reparations)}
            </strong>
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2 border-t border-brand-light-grey/50 pt-3">
          <button
            type="button"
            disabled={envoi || !prixTexte.trim()}
            onClick={() =>
              void appel(`/api/produits/${produitId}/prix`, "POST", {
                prix_vente_fixe: Number(prixTexte),
              }).then((ok) => {
                if (ok) {
                  afficher("Prix fixé — produit en vente.");
                  setModalPrix(false);
                  void rafraichir();
                }
              })
            }
            className="btn btn-primaire"
          >
            Mettre en vente
          </button>
        </div>
      </Modale>

      <Modale
        titre="Ajouter une réparation"
        ouverte={modalReparation}
        onFermer={() => setModalReparation(false)}
      >
        <div className="space-y-3">
          <input
            type="number"
            min={1}
            step={1}
            value={coutReparation}
            onChange={(e) => setCoutReparation(e.target.value)}
            autoFocus
            placeholder="Coût (DA) *"
            className="champ"
          />
          <input
            type="text"
            value={descReparation}
            onChange={(e) => setDescReparation(e.target.value)}
            placeholder="Description *"
            className="champ"
          />
          <div className="text-right">
            <button
              type="button"
              disabled={envoi || !coutReparation.trim() || !descReparation.trim()}
              onClick={() =>
                void appel(`/api/produits/${produitId}/reparations`, "POST", {
                  cout: Number(coutReparation),
                  description: descReparation,
                }).then((ok) => {
                  if (ok) {
                    afficher("Réparation ajoutée.");
                    setModalReparation(false);
                    setCoutReparation("");
                    setDescReparation("");
                    void rafraichir();
                  }
                })
              }
              className="btn btn-primaire"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modale>

      <Modale
        titre="Modifier le produit"
        ouverte={modalEdition}
        modificationsNonEnregistrees={editionModifiee || editPhotosModifiees}
        onFermer={() => setModalEdition(false)}
      >
        {brouillonDisponible && (
          <div className="mb-4 rounded-lg bg-brand-orange/10 p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border border-brand-orange/20 animate-entree">
            <div className="text-sm">
              <p className="font-semibold text-brand-orange">Un brouillon non enregistré est disponible.</p>
              <p className="text-xs text-brand-orange/80">Sauvegardé {new Date(brouillonDisponible.timestamp).toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={supprimerBrouillon} className="btn btn-secondaire flex-1 sm:flex-none">Supprimer</button>
              <button type="button" onClick={restaurerBrouillon} className="btn bg-brand-orange text-white hover:bg-brand-orange/90 flex-1 sm:flex-none">Reprendre</button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-ref">
              Référence *
            </label>
            <input
              id="edit-ref"
              type="text"
              value={edition.reference}
              onChange={(e) => setEdition({ ...edition, reference: e.target.value })}
              autoFocus
              className="champ"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="libelle mb-1.5 whitespace-nowrap" htmlFor="edit-cat">
                Catégorie&nbsp;*
              </label>
              <input
                id="edit-cat"
                type="text"
                value={edition.categorie}
                onChange={(e) => setEdition({ ...edition, categorie: e.target.value })}
                className="champ"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="libelle mb-1.5 whitespace-nowrap" htmlFor="edit-prix">
                Prix achat (DA)&nbsp;*
              </label>
              <input
                id="edit-prix"
                type="number"
                min={0}
                step={1}
                value={edition.prix_achat}
                onChange={(e) => setEdition({ ...edition, prix_achat: e.target.value })}
                className="champ text-right"
              />
            </div>
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-quantite">
              Quantité totale *
            </label>
            <input
              id="edit-quantite"
              type="number"
              min={1}
              step={1}
              value={edition.quantite}
              onChange={(e) => setEdition({ ...edition, quantite: e.target.value.replace(/[^\d]/g, "") })}
              className="champ text-right"
            />
          </div>
          <div>
            <label className="libelle mb-1.5">{t("inventaire.photos")}</label>
            <ChampPhotos
              photos={editPhotos}
              onChange={(p) => {
                setEditPhotos(p);
                setEditPhotosModifiees(true);
              }}
              disabled={envoi}
            />
          </div>
          <div className="pt-1 text-right">
            <button
              type="button"
              disabled={
                envoi ||
                !edition.reference.trim() ||
                !edition.categorie.trim() ||
                !Number.isInteger(Number(edition.prix_achat)) ||
                Number(edition.prix_achat) < 0 ||
                !Number.isInteger(Number(edition.quantite)) ||
                Number(edition.quantite) < 1
              }
              onClick={() =>
                void appel(`/api/produits/masse/edition`, "PUT", {
                  ids: produit.ids_modele,
                  reference: edition.reference.trim(),
                  categorie: edition.categorie.trim(),
                  prix_achat: Number(edition.prix_achat),
                  quantite: Number(edition.quantite),
                  ...(editPhotosModifiees ? { images: editPhotos } : {}),
                }).then((ok) => {
                  if (ok) {
                    afficher("Produit modifié.");
                    validerEdition();
                    setModalEdition(false);
                    void rafraichir();
                  }
                })
              }
              className="btn btn-primaire"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </Modale>

      <Modale
        titre={`Supprimer — ${produit.code_interne}`}
        ouverte={modalSuppression}
        onFermer={() => setModalSuppression(false)}
      >
        <p className="text-sm text-brand-warm-grey">
          Le produit <strong className="text-brand-black">{produit.reference}</strong> sera
          définitivement retiré de l'inventaire, avec son historique de statuts et ses
          réparations. Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalSuppression(false)}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() =>
              void appel(`/api/produits/${produitId}`, "DELETE", undefined).then((ok) => {
                if (ok) {
                  afficher(`Produit ${produit.code_interne} supprimé.`);
                  router.push("/inventaire");
                }
              })
            }
            className="btn btn-danger"
          >
            <IconeCorbeille taille={15} />
            Supprimer définitivement
          </button>
        </div>
      </Modale>

      {visionneuseOuverte && produit.images.length > 0 && (
        <VisionneusePhotos
          photos={produit.images}
          index={indexActif}
          onFermer={() => setVisionneuseOuverte(false)}
          onNaviguer={setIndexActif}
          lienTelechargement={(i) => `${produit.images[i]}?download=1`}
          titre={produit.code_interne}
        />
      )}
    </div>
  );
}
