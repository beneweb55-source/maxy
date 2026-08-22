"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/contexte";
import type { Role, StatutLot, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import ChampPhotos from "@/components/ChampPhotos";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT, INFOS_STATUT_LOT } from "@/lib/statuts";
import {
  PLACEHOLDERS_NOTE,
  STATUTS_NOTE_OBLIGATOIRE,
  TRANSITIONS_MANUELLES,
} from "@/lib/transitions";
import {
  ICONES_STATUT,
  IconeCle,
  IconeCoche,
  IconeCorbeille,
  IconeCrayon,
  IconeFlecheGauche,
  IconeLancer,
  IconeNote,
  IconePlus,
  IconePortefeuille,
} from "@/components/icons";

interface ReparationDto {
  id: number;
  cout: number;
  description: string;
  date: string;
}

interface ProduitDto {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  prix_achat: number;
  image_url: string | null;
  nb_images: number;
  derniere_note: string | null;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  reparations: ReparationDto[];
}

interface LotDto {
  id: number;
  fournisseur: string;
  date_entree: string;
  statut_lot: StatutLot;
  description: string | null;
  cout_global_declare: number | null;
  mode_cout: "manuel" | "auto";
  cout_valide: boolean;
  quantite_attendue: number | null;
  produits: ProduitDto[];
}

function BoutonTransition({ avant, cible }: { avant: StatutProduit; cible: StatutProduit }) {
  if (avant === "recu" && cible === "en_test") {
    return (
      <>
        <IconeLancer taille={14} />
        Commencer le test
      </>
    );
  }
  if (avant === "manque_piece" && cible === "a_reparer") {
    return (
      <>
        <IconeCle taille={14} />
        Pièce reçue — à réparer
      </>
    );
  }
  if (avant === "a_reparer" && cible === "ok") {
    return (
      <>
        <IconeCoche taille={14} />
        Réparé — OK
      </>
    );
  }
  const Icone = ICONES_STATUT[cible];
  return (
    <>
      <Icone taille={14} />
      {INFOS_STATUT[cible].libelle}
    </>
  );
}

export default function EcranLot({ lotId, role }: { lotId: number; role: Role }) {
  const { afficher } = useToast();
  const t = useT();
  const [lot, setLot] = useState<LotDto | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [modalNote, setModalNote] = useState<{ produits: ProduitDto[]; cible: StatutProduit } | null>(
    null
  );
  const [noteTexte, setNoteTexte] = useState("");
  const [modalPrix, setModalPrix] = useState<ProduitDto[] | null>(null);
  const [prixTexte, setPrixTexte] = useState("");
  const [modalReparation, setModalReparation] = useState<ProduitDto | null>(null);
  const [coutReparation, setCoutReparation] = useState("");
  const [descReparation, setDescReparation] = useState("");
  const [modalCloture, setModalCloture] = useState(false);
  const [modalManque, setModalManque] = useState(false);
  const [msgManque, setMsgManque] = useState("");
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nouvRef, setNouvRef] = useState("");
  const [nouvCat, setNouvCat] = useState("");
  const [nouvPrix, setNouvPrix] = useState("");
  const [nouvPrixVente, setNouvPrixVente] = useState("");
  const [nouvQuantite, setNouvQuantite] = useState("1");
  const [nouvPhotos, setNouvPhotos] = useState<string[]>([]);

  const [modalEdit, setModalEdit] = useState<ProduitDto[] | null>(null);
  const [editRef, setEditRef] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editPrix, setEditPrix] = useState("");
  const [editQuantite, setEditQuantite] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPhotosModifiees, setEditPhotosModifiees] = useState(false);
  const [modalSuppr, setModalSuppr] = useState<ProduitDto[] | null>(null);

  const peutAgir = role === "technicien" || role === "gerant";
  const estTechnicien = role === "technicien";
  const estGerant = role === "gerant";

  const rafraichir = useCallback(async () => {
    try {
      const res = await fetch(`/api/lots/${lotId}`, { cache: "no-store" });
      const corps = (await res.json().catch(() => null)) as LotDto | { error?: string } | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement du lot.");
        return;
      }
      setLot(corps as LotDto);
      setErreur(null);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [lotId]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  async function appelApi(url: string, corps: unknown): Promise<boolean> {
    setEnvoi(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const reponse = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(reponse?.error ?? "Erreur lors de l'opération.", "erreur");
        return false;
      }
      await rafraichir();
      return true;
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
      return false;
    } finally {
      setEnvoi(false);
    }
  }

  function demanderTransition(produits: ProduitDto[], cible: StatutProduit) {
    if (STATUTS_NOTE_OBLIGATOIRE.includes(cible)) {
      setNoteTexte("");
      setModalNote({ produits, cible });
      return;
    }
    void appelApi(`/api/produits/masse/statut`, { ids: produits.map(p => p.id), statut: cible }).then(
      (ok) => ok && afficher(`${produits.length} produit(s) → ${INFOS_STATUT[cible].libelle}`)
    );
  }

  async function confirmerNote() {
    if (!modalNote) return;
    const { produits, cible } = modalNote;
    const ok = await appelApi(`/api/produits/masse/statut`, {
      ids: produits.map(p => p.id),
      statut: cible,
      note: noteTexte,
    });
    if (ok) {
      afficher(`${produits.length} produit(s) → ${INFOS_STATUT[cible].libelle}`);
      setModalNote(null);
    }
  }

  async function confirmerReparation() {
    if (!modalReparation) return;
    const ok = await appelApi(`/api/produits/${modalReparation.id}/reparations`, {
      cout: Number(coutReparation),
      description: descReparation,
    });
    if (ok) {
      afficher(`Réparation ajoutée sur ${modalReparation.code_interne}`);
      setModalReparation(null);
      setCoutReparation("");
      setDescReparation("");
    }
  }

  async function confirmerCloture() {
    const ok = await appelApi(`/api/lots/${lotId}/cloture`, {});
    if (ok) {
      afficher("Lot clôturé — rapport généré, Imed a été notifié.");
      setModalCloture(false);
    }
  }

  async function validerCout() {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/lots/${lotId}/valider-cout`, { method: "POST" });
      const corps = (await res.json().catch(() => null)) as
        | { message?: string; montant?: number; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la validation du coût.", "erreur");
        return;
      }
      afficher(corps?.message ?? "Coût validé et retiré de la caisse.");
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function signalerManque() {
    if (!msgManque.trim()) {
      afficher("Veuillez saisir un message.", "erreur");
      return;
    }
    const ok = await appelApi(`/api/lots/${lotId}/signaler-manque`, { message: msgManque.trim() });
    if (ok) {
      afficher("Alerte envoyée à Imed.");
      setModalManque(false);
      setMsgManque("");
    }
  }

  async function appelMethode(url: string, methode: string, corps?: unknown): Promise<boolean> {
    setEnvoi(true);
    try {
      const res = await fetch(url, {
        method: methode,
        headers: corps === undefined ? undefined : { "Content-Type": "application/json" },
        body: corps === undefined ? undefined : JSON.stringify(corps),
      });
      const reponse = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(reponse?.error ?? "Erreur lors de l'opération.", "erreur");
        return false;
      }
      await rafraichir();
      return true;
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
      return false;
    } finally {
      setEnvoi(false);
    }
  }

  function ouvrirEdition(produits: ProduitDto[]) {
    const produit = produits[0];
    if (!produit) return;
    setEditRef(produit.reference);
    setEditCat(produit.categorie);
    setEditPrix(String(produit.prix_achat));
    setEditQuantite(String(produits.length));
    setEditPhotos(produit.image_url ? [produit.image_url] : []);
    setEditPhotosModifiees(false);
    setModalEdit(produits);
    // Récupère la galerie complète (au-delà de la couverture) pour l'édition.
    if (produit.nb_images > 1) {
      void fetch(`/api/produits/${produit.id}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ images?: string[] }>) : null))
        .then((d) => {
          if (d?.images) setEditPhotos(d.images);
        })
        .catch(() => undefined);
    }
  }

  async function confirmerEdition() {
    if (!modalEdit) return;
    if (!editRef.trim() || !editCat.trim() || !editPrix.trim() || !editQuantite.trim()) {
      afficher("Veuillez remplir la référence, catégorie, prix et quantité.", "erreur");
      return;
    }
    const corps: Record<string, unknown> = {
      ids: modalEdit.map(p => p.id),
      reference: editRef.trim(),
      categorie: editCat.trim(),
      prix_achat: Number(editPrix),
      quantite: Number(editQuantite),
    };
    if (editPhotosModifiees) corps.images = editPhotos;
    const ok = await appelMethode(`/api/produits/masse/edition`, "PUT", corps);
    if (ok) {
      afficher(`${modalEdit.length} produit(s) modifié(s).`);
      setModalEdit(null);
    }
  }

  async function confirmerSuppression() {
    if (!modalSuppr) return;
    const ok = await appelMethode(`/api/produits/masse/suppression`, "DELETE", { ids: modalSuppr.map(p => p.id) });
    if (ok) {
      afficher(`${modalSuppr.length} produit(s) supprimé(s).`);
      setModalSuppr(null);
    }
  }

  async function confirmerPrix() {
    if (!modalPrix) return;
    const prix = Number(prixTexte);
    if (!Number.isInteger(prix) || prix <= 0) {
      afficher("Prix invalide.", "erreur");
      return;
    }
    const ok = await appelApi(`/api/produits/masse/prix`, {
      ids: modalPrix.map(p => p.id),
      prix_vente_fixe: prix,
    });
    if (ok) {
      afficher(`Prix fixé pour ${modalPrix.length} produit(s).`);
      setModalPrix(null);
      setPrixTexte("");
    }
  }

  async function ajouterProduit() {
    if (!nouvRef.trim() || !nouvCat.trim() || !nouvPrix.trim()) {
      afficher("Veuillez remplir la référence, catégorie et prix.", "erreur");
      return;
    }
    
    const quantite = Math.max(1, Number(nouvQuantite) || 1);
    // On envoie une seule ligne (avec ses photos) + la quantité : le serveur la
    // réplique. Évite de dupliquer les photos N fois dans le corps de requête.
    const ok = await appelApi(`/api/lots/${lotId}/produits`, {
      produits: [
        {
          reference: nouvRef.trim(),
          categorie: nouvCat.trim(),
          prix_achat: Number(nouvPrix),
          prix_vente_fixe: nouvPrixVente.trim() ? Number(nouvPrixVente) : null,
          images: nouvPhotos,
        },
      ],
      quantite,
    });
    if (ok) {
      afficher("Produit ajouté au lot.");
      setNouvRef("");
      setNouvPrix("");
      setNouvPrixVente("");
      setNouvQuantite("1");
      setNouvPhotos([]);
      setAjoutOuvert(false);
    }
  }

  if (erreur && !lot) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}{" "}
        <Link href="/arrivages" className="underline">
          {t("ecranLot.retourArrivages")}
        </Link>
      </div>
    );
  }
  if (!lot) return <p className="p-4 text-sm text-brand-warm-grey">{t("ecranLot.chargement")}</p>;

  const nbTestes = lot.produits.filter(
    (p) => p.statut !== "recu" && p.statut !== "en_test"
  ).length;
  const nbRecus = lot.produits.filter((p) => p.statut === "recu").length;
  const pct = lot.produits.length > 0 ? Math.round((nbTestes / lot.produits.length) * 100) : 0;
  const infosLot = INFOS_STATUT_LOT[lot.statut_lot];
  const totalAchat = lot.produits.reduce((s, p) => s + p.prix_achat, 0);
  const montantCout = lot.mode_cout === "auto" ? totalAchat : lot.cout_global_declare ?? 0;
  const categoriesExistantes = Array.from(new Set(lot.produits.map((p) => p.categorie))).sort();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-entree pb-24">
      <Link href="/arrivages" className="lien inline-flex items-center gap-1.5 text-sm">
        <IconeFlecheGauche taille={14} />
        {t("ecranLot.retourArrivages")}
      </Link>

      <div className="carte">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-black pb-1">
              {t("ecranLot.titreLot", { id: lot.id, fournisseur: lot.fournisseur })}
            </h1>
            <p className="text-xs text-brand-warm-grey">
              {t("ecranLot.infosSup", {
                date: new Date(lot.date_entree).toLocaleDateString("fr-FR"),
                n: lot.produits.length,
                s: lot.produits.length > 1 ? "s" : "",
                cout: formaterDA(totalAchat)
              }).replace("{n} ", "").replace("  ", " ")}
              {lot.description ? ` · ${lot.description}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${infosLot.badge}`}>
            {infosLot.libelle}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-light-grey">
            <div className="h-full rounded-full bg-brand-orange" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-brand-warm-grey">
            {t("ecranLot.testesSur", { testes: nbTestes, total: lot.produits.length })}
          </span>
        </div>
      </div>

      <div className="carte space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-grey">
              {t("ecranLot.coutLot", { mode: lot.mode_cout === "auto" ? t("ecranLot.modeAuto") : t("ecranLot.modeManuel") })}
            </p>
            {lot.mode_cout === "auto" ? (
              <p className="mt-0.5 text-sm">
                {t("ecranLot.coutCalcule")}{" "}
                <strong className="text-brand-black">{formaterDA(montantCout)}</strong>
              </p>
            ) : (
              <p className="mt-0.5 text-sm">
                {t("ecranLot.coutDeclare")}{" "}
                <strong className="text-brand-black">
                  {lot.cout_global_declare !== null ? formaterDA(lot.cout_global_declare) : "—"}
                </strong>
                {lot.cout_global_declare !== null && lot.cout_global_declare !== totalAchat && (
                  <span className="text-brand-warm-grey">
                    {" "}
                    · écart vs achats {formaterDA(lot.cout_global_declare - totalAchat)}
                  </span>
                )}
              </p>
            )}
          </div>
          {lot.cout_valide ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <IconeCoche taille={13} />
              Coût validé en caisse
            </span>
          ) : estGerant ? (
            <button
              type="button"
              disabled={envoi || montantCout <= 0}
              onClick={() => void validerCout()}
              className="btn btn-primaire"
              title={montantCout <= 0 ? t("ecranLot.erreurCout") : undefined}
            >
              <IconePortefeuille taille={15} />
              {t("ecranLot.validerCout", { montant: formaterDA(montantCout) })}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {t("ecranLot.attenteValidation")}
            </span>
          )}
        </div>
        {!lot.cout_valide && estGerant && (
          <p className="text-xs text-brand-warm-grey">
            {t("ecranLot.explicationValidation", { montant: formaterDA(montantCout) })}
          </p>
        )}
      </div>

      {lot.statut_lot === "teste" && (
        <div className="bandeau-info">
          {t("ecranLot.rapportPret")}{" "}
          <Link href={`/rapports/${lot.id}`} className="font-semibold underline">
            {t("ecranLot.voirRapport")}
          </Link>
        </div>
      )}
      {lot.statut_lot === "valide" && (
        <div className="bandeau-succes">
          {t("ecranLot.rapportValide")}{" "}
          <Link href={`/rapports/${lot.id}`} className="font-semibold underline">
            {t("ecranLot.voirRapport")}
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {(() => {
          const groupes: Record<string, ProduitDto[]> = {};
          for (const p of lot.produits) {
            const cle = `${p.reference}|${p.categorie}|${p.prix_achat}|${p.statut}|${p.prix_vente_fixe}|${p.image_url ?? ""}|${p.derniere_note ?? ""}`;
            if (!groupes[cle]) groupes[cle] = [];
            groupes[cle].push(p);
          }
          const liste = Object.values(groupes);
          liste.forEach(g => g.sort((a, b) => a.code_interne.localeCompare(b.code_interne)));
          return liste;
        })().map((groupe, idx) => {
          const p = groupe[0];
          if (!p) return null;
          const nb = groupe.length;
          const cibles = peutAgir ? (TRANSITIONS_MANUELLES[p.statut] ?? []) : [];
          return (
            <li key={idx} className="carte">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  {p.image_url && (
                    <div className="relative shrink-0">
                      <img
                        src={p.image_url}
                        alt={`Photo de ${p.reference}`}
                        loading="lazy"
                        className="h-12 w-12 rounded-lg border border-brand-light-grey object-cover"
                      />
                      {p.nb_images > 1 && (
                        <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white shadow">
                          {p.nb_images}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    {nb === 1 ? (
                      <Link
                        href={`/produits/${p.id}`}
                        className="block truncate text-sm font-semibold transition hover:text-brand-crystal hover:underline"
                      >
                        <span className="font-mono text-xs text-brand-warm-grey">
                          {p.code_interne}
                        </span>{" "}
                        {p.reference}
                      </Link>
                    ) : (
                      <div className="block truncate text-sm font-semibold text-brand-black">
                        <span className="font-mono text-xs text-brand-warm-grey">
                          {nb} produits ({p.code_interne} à {groupe[nb - 1]?.code_interne})
                        </span>{" "}
                        {p.reference}
                      </div>
                    )}
                    <p className="text-xs text-brand-warm-grey">
                      {p.categorie} · {t("ecranLot.achat")} {formaterDA(p.prix_achat)}
                      {p.cout_reparations > 0 && ` · ${t("ecranLot.reparations")} ${formaterDA(p.cout_reparations)}`}
                    </p>
                  </div>
                </div>
                <BadgeStatut statut={p.statut} />
              </div>

              {p.derniere_note && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-light-grey/25 px-2.5 py-1.5 text-xs text-brand-smooth">
                  <IconeNote taille={13} className="mt-0.5 shrink-0 text-brand-warm-grey" />
                  {p.derniere_note}
                </p>
              )}

              {p.statut !== "vendu" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cibles.map((cible) => (
                    <button
                      key={cible}
                      type="button"
                      disabled={envoi}
                      onClick={() => demanderTransition(groupe, cible)}
                      className="btn btn-secondaire"
                    >
                      <BoutonTransition avant={p.statut} cible={cible} />
                    </button>
                  ))}
                  {peutAgir && nb === 1 && (
                    <button
                      type="button"
                      disabled={envoi}
                      onClick={() => setModalReparation(p)}
                      className="btn border border-dashed border-brand-grey bg-brand-white text-brand-warm-grey hover:bg-brand-light-grey/25"
                    >
                      <IconePlus taille={14} />
                      {t("ecranLot.reparation")}
                    </button>
                  )}
                  {estGerant && p.statut === "ok" && (
                    <button
                      type="button"
                      disabled={envoi}
                      onClick={() => {
                        setPrixTexte("");
                        setModalPrix(groupe);
                      }}
                      className="btn btn-primaire"
                    >
                      {t("ecranLot.fixerPrix", { n: nb })}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => ouvrirEdition(groupe)}
                    className="btn btn-secondaire"
                  >
                    <IconeCrayon taille={14} />
                    {t("ecranLot.modifier", { n: nb })}
                  </button>
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => setModalSuppr(groupe)}
                    className="btn border border-danger/30 bg-brand-white text-danger hover:bg-danger/10"
                  >
                    <IconeCorbeille taille={14} />
                    {t("ecranLot.supprimer", { n: nb })}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {lot.statut_lot === "en_cours_de_test" && (
        <div className="carte">
          <button
            type="button"
            onClick={() => setAjoutOuvert(!ajoutOuvert)}
            className="lien inline-flex items-center gap-1.5 text-sm"
          >
            <IconePlus taille={14} />
            {ajoutOuvert ? t("ecranLot.masquerAjout") : t("ecranLot.ajouterProduit")}
          </button>
          {ajoutOuvert && (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!envoi && nouvRef.trim() && nouvCat.trim() && nouvPrix.trim()) {
                  void ajouterProduit();
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="libelle mb-1.5">{t("ecranLot.reference")}</label>
                  <input type="text" className="champ" value={nouvRef} onChange={e => setNouvRef(e.target.value)} />
                </div>
                <div>
                  <label className="libelle mb-1.5">{t("ecranLot.categorie")}</label>
                  <input type="text" list="cat-exist" className="champ" value={nouvCat} onChange={e => setNouvCat(e.target.value)} />
                  <datalist id="cat-exist">
                    {categoriesExistantes.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="libelle mb-1.5">{t("ecranLot.prixAchat")}</label>
                  <input type="number" inputMode="numeric" min="0" step="1" className="champ" value={nouvPrix} onChange={e => setNouvPrix(e.target.value.replace(/[^\d]/g, ""))} />
                </div>
                <div>
                  <label className="libelle mb-1.5">Prix de vente</label>
                  <input type="number" inputMode="numeric" min="0" step="1" className="champ" value={nouvPrixVente} onChange={e => setNouvPrixVente(e.target.value.replace(/[^\d]/g, ""))} placeholder="—" />
                </div>
                <div>
                  <label className="libelle mb-1.5">{t("ecranLot.quantite")}</label>
                  <input type="number" inputMode="numeric" min="1" step="1" className="champ" value={nouvQuantite} onChange={e => setNouvQuantite(e.target.value.replace(/[^\d]/g, ""))} />
                </div>
                <div className="md:col-span-2">
                  <label className="libelle mb-1.5">{t("ecranLot.photos")}</label>
                  <ChampPhotos photos={nouvPhotos} onChange={setNouvPhotos} disabled={envoi} />
                </div>
              </div>
              <div className="text-right">
                <button
                  type="submit"
                  disabled={envoi || !nouvRef.trim() || !nouvCat.trim() || !nouvPrix.trim()}
                  className="btn btn-primaire"
                >
                  {t("ecranLot.ajouterAuLot")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {estTechnicien && lot.statut_lot === "en_cours_de_test" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-light-grey bg-brand-white p-3 lg:pl-60">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="text-xs text-brand-warm-grey">
              {lot.quantite_attendue !== null && lot.produits.length !== lot.quantite_attendue ? t("ecranLot.erreurEcart", { n: lot.produits.length, attendu: lot.quantite_attendue }) : (nbRecus > 0
                ? t("ecranLot.nbRecus", { n: nbRecus })
                : t("ecranLot.testConforme"))}
            </p>
            <div className="flex gap-2">
              {(lot.quantite_attendue !== null && lot.produits.length !== lot.quantite_attendue) && (
                <button
                  type="button"
                  onClick={() => setModalManque(true)}
                  className="btn btn-danger"
                >
                  {t("ecranLot.signalerEcart")}
                </button>
              )}
              <button
                type="button"
                disabled={nbRecus > 0 || envoi || (lot.quantite_attendue !== null && lot.produits.length !== lot.quantite_attendue)}
                onClick={() => setModalCloture(true)}
                className="btn btn-primaire"
              >
                <IconeCoche taille={15} />
                {t("ecranLot.cloturerTest")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modale
        titre={
          modalNote
            ? t("ecranLot.titreNote", { n: modalNote.produits.length, statut: INFOS_STATUT[modalNote.cible].libelle })
            : ""
        }
        ouverte={modalNote !== null}
        onFermer={() => setModalNote(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!(!noteTexte.trim() || envoi)) {
              void confirmerNote();
            }
          }}
        >
        <textarea
          value={noteTexte}
          onChange={(e) => setNoteTexte(e.target.value)}
          rows={3}
          autoFocus
          placeholder={modalNote ? PLACEHOLDERS_NOTE[modalNote.cible] : ""}
          className="champ"
        />
        <div className="mt-3 text-right">
          <button
            type="submit"
            disabled={!noteTexte.trim() || envoi}
            className="btn btn-primaire"
          >
            {t("ecranLot.confirmerChangement")}
          </button>
        </div>
        </form>
      </Modale>

      <Modale
        titre={modalReparation ? t("ecranLot.reparationCode", { code: modalReparation.code_interne }) : ""}
        ouverte={modalReparation !== null}
        onFermer={() => setModalReparation(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!(envoi || !coutReparation.trim() || !descReparation.trim())) {
              void confirmerReparation();
            }
          }}
        >
        {modalReparation && modalReparation.reparations.length > 0 && (
          <ul className="mb-3 space-y-1 rounded-lg bg-brand-light-grey/25 p-2.5 text-xs text-brand-smooth">
            {modalReparation.reparations.map((r) => (
              <li key={r.id}>
                {new Date(r.date).toLocaleDateString("fr-FR")} — {r.description} ·{" "}
                <strong>{formaterDA(r.cout)}</strong>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-3">
          <div>
            <label className="libelle mb-1.5" htmlFor="cout-rep">
              {t("ecranLot.coutDA")} *
            </label>
            <input
              id="cout-rep"
              type="number"
              min={1}
              step={1}
              value={coutReparation}
              onChange={(e) => setCoutReparation(e.target.value)}
              autoFocus
              className="champ"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="desc-rep">
              {t("ecranLot.description")} *
            </label>
            <input
              id="desc-rep"
              type="text"
              value={descReparation}
              onChange={(e) => setDescReparation(e.target.value)}
              placeholder={t("ecranLot.placeholderRep")}
              className="champ"
            />
          </div>
          <div className="text-right">
            <button
              type="submit"
              disabled={envoi || !coutReparation.trim() || !descReparation.trim()}
              className="btn btn-primaire"
            >
              {t("ecranLot.enregistrerRep")}
            </button>
          </div>
        </div>
        </form>
      </Modale>

      <Modale
        titre={t("ecranLot.signalerEcart")}
        ouverte={modalManque}
        onFermer={() => setModalManque(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!(envoi || !msgManque.trim())) {
              void signalerManque();
            }
          }}
        >
        <p className="text-sm text-brand-warm-grey mb-3">
          {t("ecranLot.explicationEcart")}
        </p>
        <textarea
          value={msgManque}
          onChange={(e) => setMsgManque(e.target.value)}
          rows={3}
          className="champ mb-3"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setModalManque(false)} className="btn btn-secondaire">
            {t("ecranLot.annuler")}
          </button>
          <button
            type="submit"
            disabled={envoi || !msgManque.trim()}
            className="btn btn-danger"
          >
            {t("ecranLot.envoyerAlerte")}
          </button>
        </div>
        </form>
      </Modale>

      <Modale
        titre={t("ecranLot.cloturerTest")}
        ouverte={modalCloture}
        onFermer={() => setModalCloture(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!envoi) {
              void confirmerCloture();
            }
          }}
        >
        <p className="text-sm text-brand-warm-grey">
          {t("ecranLot.explicationCloture")}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setModalCloture(false)} className="btn btn-secondaire">
            {t("ecranLot.annuler")}
          </button>
          <button
            type="submit"
            disabled={envoi}
            className="btn btn-primaire"
          >
            {t("ecranLot.cloturer")}
          </button>
        </div>
        </form>
      </Modale>

      <Modale
        titre={modalEdit ? t("ecranLot.modifierN", { n: modalEdit.length }) : ""}
        ouverte={modalEdit !== null}
        onFermer={() => setModalEdit(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(envoi || !editRef.trim() || !editCat.trim() || !editPrix.trim() || !editQuantite.trim())) {
              void confirmerEdition();
            }
          }}
        >
          <div>
            <label className="libelle mb-1.5" htmlFor="edit-ref-lot">
              {t("ecranLot.reference")} *
            </label>
            <input
              id="edit-ref-lot"
              type="text"
              value={editRef}
              onChange={(e) => setEditRef(e.target.value)}
              autoFocus
              className="champ"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="libelle mb-1.5" htmlFor="edit-cat-lot">
                {t("ecranLot.categorie")} *
              </label>
              <input
                id="edit-cat-lot"
                type="text"
                list="cat-exist"
                value={editCat}
                onChange={(e) => setEditCat(e.target.value)}
                className="champ"
              />
            </div>
            <div className="flex gap-3 sm:w-64">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="edit-prix-lot">
                  {t("ecranLot.prixAchat")} *
                </label>
                <input
                  id="edit-prix-lot"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={editPrix}
                  onChange={(e) => setEditPrix(e.target.value.replace(/[^\d]/g, ""))}
                  className="champ text-right"
                />
              </div>
              <div className="w-24 shrink-0">
                <label className="libelle mb-1.5" htmlFor="edit-quantite-lot">
                  {t("ecranLot.quantite")} *
                </label>
                <input
                  id="edit-quantite-lot"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={editQuantite}
                  onChange={(e) => setEditQuantite(e.target.value.replace(/[^\d]/g, ""))}
                  className="champ text-center"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="libelle mb-1.5">{t("ecranLot.photos")}</label>
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
              type="submit"
              disabled={envoi || !editRef.trim() || !editCat.trim() || !editPrix.trim() || !editQuantite.trim()}
              className="btn btn-primaire"
            >
              {t("ecranLot.enregistrerModifs")}
            </button>
          </div>
        </form>
      </Modale>

      <Modale
        titre={modalSuppr ? t("ecranLot.supprimerN", { n: modalSuppr.length }) : ""}
        ouverte={modalSuppr !== null}
        onFermer={() => setModalSuppr(null)}
      >
        {modalSuppr && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!envoi) {
                void confirmerSuppression();
              }
            }}
          >
            <p className="text-sm text-brand-warm-grey">
              {t("ecranLot.explicationSuppression", { n: modalSuppr.length })}
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
                type="submit"
                disabled={envoi}
                className="btn btn-danger"
              >
                <IconeCorbeille taille={15} />
                Supprimer définitivement
              </button>
            </div>
          </form>
        )}
      </Modale>

      <Modale
        titre="Fixer le prix de vente"
        ouverte={modalPrix !== null}
        onFermer={() => setModalPrix(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!envoi) {
              void confirmerPrix();
            }
          }}
        >
          <p className="text-sm text-brand-warm-grey mb-3">
            Fixer le prix de vente pour les <strong className="text-brand-black">{modalPrix?.length}</strong> produit(s) sélectionné(s).
          </p>
          <input
            type="number"
            min={1}
            step={1}
            value={prixTexte}
            onChange={(e) => setPrixTexte(e.target.value)}
            autoFocus
            placeholder="Prix de vente (DA)"
            className="champ mb-3"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalPrix(null)}
              className="btn btn-secondaire"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={envoi || !prixTexte.trim()}
              className="btn btn-primaire"
            >
              Fixer le prix
            </button>
          </div>
        </form>
      </Modale>
    </div>
  );
}
