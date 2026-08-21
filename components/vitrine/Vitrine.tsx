"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/contexte";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  IconeAlerte,
  IconeBillet,
  IconeImage,
  IconePlus,
  IconeTelechargement,
  IconeVitrine,
} from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";


interface UniteVendable {
  id: number;
  code_interne: string;
  prix_vente_fixe: number | null;
  etiquette_imprimee: boolean;
}

interface CarteVitrine {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  image_url: string | null;
  images: string[];
  quantite: number;
  ids_en_vitrine: number[];
  vendables: UniteVendable[];
}

interface ReponseVitrine {
  total: number;
  produits: CarteVitrine[];
}

interface LignePanier {
  id: number;
  code_interne: string;
  reference: string;
  prix: number;
}

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Vitrine({ role }: { role: Role }) {
  const router = useRouter();
  const { afficher } = useToast();
  const t = useT();
  const [donnees, setDonnees] = useState<ReponseVitrine | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [apercuPhotos, setApercuPhotos] = useState<{
    photos: string[];
    index: number;
    titre: string;
  } | null>(null);

  const [panier, setPanier] = useState<Map<number, LignePanier>>(new Map());
  const [modalVente, setModalVente] = useState(false);
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [avertissement, setAvertissement] = useState<string | null>(null);

  const peutRetirer = role === "gerant" || role === "technicien" || role === "dev";
  const peutVendre = role === "gerant" || role === "dev" || role === "social_media";

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const res = await fetch("/api/vitrine");
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement de la vitrine.");
      }
      setDonnees((await res.json()) as ReponseVitrine);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function retirer(carte: CarteVitrine) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/produits/masse/vitrine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: carte.ids_en_vitrine, en_vitrine: false }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du retrait.", "erreur");
        return;
      }
      afficher(`${carte.reference} retiré de la vitrine.`);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }


  function unitesVendables(carte: CarteVitrine): UniteVendable[] {
    return carte.vendables.filter((v) => (v.prix_vente_fixe ?? 0) > 0);
  }

  function basculerPanier(carte: CarteVitrine) {
    const dispo = unitesVendables(carte);
    setPanier((prev) => {
      const suivant = new Map(prev);
      const dejaDuModele = dispo.filter((v) => suivant.has(v.id));
      if (dejaDuModele.length > 0) {
        suivant.delete(dejaDuModele[dejaDuModele.length - 1]!.id);
        return suivant;
      }
      const libre = dispo.find((v) => !suivant.has(v.id));
      if (!libre) return suivant;
      suivant.set(libre.id, {
        id: libre.id,
        code_interne: libre.code_interne,
        reference: carte.reference,
        prix: libre.prix_vente_fixe!,
      });
      return suivant;
    });
  }

  function ajouterUnite(carte: CarteVitrine) {
    const dispo = unitesVendables(carte);
    setPanier((prev) => {
      const suivant = new Map(prev);
      const libre = dispo.find((v) => !suivant.has(v.id));
      if (!libre) {
        afficher("Plus d'exemplaire disponible à la vente pour ce modèle.", "erreur");
        return prev;
      }
      suivant.set(libre.id, {
        id: libre.id,
        code_interne: libre.code_interne,
        reference: carte.reference,
        prix: libre.prix_vente_fixe!,
      });
      return suivant;
    });
  }

  function definirQuantitePanier(carte: CarteVitrine, qttVoulue: number) {
    const dispo = unitesVendables(carte);
    const qtt = Math.max(0, Math.min(qttVoulue, dispo.length));
    
    setPanier((prev) => {
      const suivant = new Map(prev);
      const dejaDuModele = dispo.filter((v) => suivant.has(v.id));
      const nbActuel = dejaDuModele.length;

      if (qtt > nbActuel) {
        const libres = dispo.filter((v) => !suivant.has(v.id));
        for (let i = 0; i < qtt - nbActuel; i++) {
          const l = libres[i];
          if (l) {
            suivant.set(l.id, {
              id: l.id,
              code_interne: l.code_interne,
              reference: carte.reference,
              prix: l.prix_vente_fixe!,
            });
          }
        }
      } else if (qtt < nbActuel) {
        for (let i = 0; i < nbActuel - qtt; i++) {
          suivant.delete(dejaDuModele[dejaDuModele.length - 1 - i]!.id);
        }
      }
      return suivant;
    });
  }

  function ouvrirVente() {
    setClientNom("");
    setClientTel("");
    setCanal("");
    setDateVente(aujourdhuiIso());
    setAvertissement(null);
    setModalVente(true);
  }

  const lignesPanier = Array.from(panier.values());
  const totalPanier = lignesPanier.reduce((s, l) => s + l.prix, 0);

  async function enregistrerVente(confirmer: boolean) {
    if (lignesPanier.length === 0) return;
    setEnvoi(true);
    try {
      const commun = {
        canal: canal.trim() || undefined,
        date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
        client_nom: clientNom.trim() || undefined,
        client_tel: clientTel.trim() || undefined,
        confirmer: confirmer || undefined,
      };
    
      const res =
        lignesPanier.length === 1
          ? await fetch("/api/ventes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_id: lignesPanier[0]!.id,
                prix_vente_reel: lignesPanier[0]!.prix,
                ...commun,
              }),
            })
          : await fetch("/api/ventes/groupee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_ids: lignesPanier.map((l) => l.id),
                prix_total: totalPanier,
                ...commun,
              }),
            });

      const corps = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            confirmation_required?: boolean;
            message?: string;
            error?: string;
            facture_id?: number;
            facture_numero?: string;
          }
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
        `Vente enregistrée — facture ${corps?.facture_numero ?? ""} créée.`
      );
      setModalVente(false);
      setPanier(new Map());
      await charger();
      if (corps?.facture_id) router.push(`/factures/${corps.facture_id}`);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  const produits = donnees?.produits ?? [];

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-extrabold tracking-tight text-brand-black">
            <IconeVitrine taille={26} />
            {t("vitrine.titre")}
          </h1>
          <p className="mt-1 text-sm text-brand-warm-grey">
            {t("vitrine.sousTitre")}
          </p>
        </div>
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black">{donnees.total}</strong>{" "}
          {t("vitrine.modelesVitrine", { n: "", s: donnees.total > 1 ? "s" : "" }).replace("{n} ", "")}{" "}
          <strong className="text-brand-black">
            {produits.reduce((s, p) => s + p.quantite, 0)}
          </strong>{" "}
          {t("vitrine.exemplairesStock", { n: "", s: produits.reduce((s, p) => s + p.quantite, 0) > 1 ? "s" : "" }).replace("· {n} ", "").replace("·  ", "")}
        </p>
      )}

      {!erreur && donnees === null && (
        <p className="text-sm text-brand-warm-grey">{t("vitrine.chargement")}</p>
      )}

      {donnees && produits.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <IconeVitrine taille={32} className="mx-auto mb-3 text-brand-grey" />
          <p className="font-semibold text-brand-black">{t("vitrine.vide")}</p>
          <p className="mt-1">
            {t("vitrine.videDesc")}
          </p>
          <Link href="/inventaire" className="btn btn-primaire mt-4">
            {t("navigation.inventaire")}
          </Link>
        </div>
      )}

      {produits.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {produits.map((p) => {
            const prix = p.prix_vente_reel ?? p.prix_vente_fixe;
            const dispo = unitesVendables(p);
            const nbAuPanier = dispo.filter((v) => panier.has(v.id)).length;
            const vendable = dispo.length > 0;
            return (
              <div
                key={p.id}
                className={`group flex flex-col overflow-hidden rounded-xl border bg-brand-white/80 backdrop-blur-lg transition hover:shadow-md effet-lumiere ${
                  nbAuPanier > 0
                    ? "border-brand-orange ring-2 ring-brand-orange"
                    : "border-brand-light-grey"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    p.images.length > 0 &&
                    setApercuPhotos({ photos: p.images, index: 0, titre: p.code_interne })
                  }
                  title={p.images.length > 0 ? "Voir les photos en grand" : undefined}
                  aria-label={`Photos de ${p.reference}`}
                  className={`relative block aspect-square w-full overflow-hidden bg-brand-paper ${
                    p.images.length > 0 ? "cursor-zoom-in" : "cursor-default"
                  }`}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={`Photo de ${p.reference}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-brand-grey">
                      <IconeImage taille={28} />
                    </span>
                  )}
                  {p.quantite > 1 && (
                    <span
                      className="absolute left-2 top-2 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white shadow"
                      title={`${p.quantite} exemplaires identiques en stock`}
                    >
                      ×{p.quantite}
                    </span>
                  )}
                  {p.images.length > 1 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      <IconeImage taille={11} />
                      {p.images.length}
                    </span>
                  )}
                  {nbAuPanier > 0 && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white shadow">
                      {nbAuPanier} {t("vitrine.ajouterPanier")}
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-brand-warm-grey">{p.code_interne}</span>
                    <BadgeStatut statut={p.statut} />
                  </div>
                  <Link
                    href={`/produits/${p.id}`}
                    className="line-clamp-2 text-sm font-semibold leading-snug transition hover:text-brand-crystal"
                    title={p.reference}
                  >
                    {p.reference}
                  </Link>
                  <p className="text-xs text-brand-warm-grey">
                    {p.categorie}
                    {p.quantite > 1 && (
                      <span className="font-semibold text-brand-orange">
                        {" "}
                        · {p.quantite} {t("vitrine.totalPanier")}
                      </span>
                    )}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                    <span className="font-bold text-brand-orange">
                      {prix !== null ? formaterDA(prix) : "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      {p.images.length > 0 && (
                        <a
                          href={`/api/produits/${p.id}/images/export`}
                          className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                          title={`Télécharger les photos de ${p.code_interne} (ZIP)`}
                          aria-label={`Télécharger les photos de ${p.code_interne}`}
                        >
                          <IconeTelechargement taille={14} />
                        </a>
                      )}
                      {peutVendre && nbAuPanier > 0 && (
                        <button
                          type="button"
                          disabled={envoi || nbAuPanier >= dispo.length}
                          onClick={() => ajouterUnite(p)}
                          title="Ajouter un exemplaire supplémentaire"
                          aria-label={`Ajouter un exemplaire de ${p.reference}`}
                          className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-orange disabled:opacity-40"
                        >
                          <IconePlus taille={14} />
                        </button>
                      )}
                      {peutRetirer && (
                        <button
                          type="button"
                          disabled={envoi}
                          onClick={() => void retirer(p)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                          title="Retirer ce modèle de la vitrine"
                        >
                          {t("vitrine.retirerVitrine")}
                        </button>
                      )}
                    </span>
                  </div>
                  {peutVendre && (
                    <div className="mt-2 flex w-full gap-2">
                      {nbAuPanier === 0 ? (
                        <button
                          type="button"
                          disabled={envoi || !vendable}
                          onClick={() => ajouterUnite(p)}
                          title={vendable ? "Vendre ce produit" : "Aucun exemplaire « En vente »"}
                          className="btn btn-primaire w-full justify-center disabled:opacity-45"
                        >
                          <IconeBillet taille={14} />
                          {t("vitrine.vendre")}
                        </button>
                      ) : (
                        <div className="flex w-full items-center justify-between rounded-md border border-brand-orange/40 bg-brand-orange/5 p-1">
                          <button
                            type="button"
                            disabled={envoi}
                            onClick={() => definirQuantitePanier(p, nbAuPanier - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded text-brand-orange hover:bg-brand-orange/20"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min={0} 
                            max={dispo.length}
                            value={nbAuPanier}
                            onChange={(e) => definirQuantitePanier(p, parseInt(e.target.value) || 0)}
                            className="w-16 bg-transparent text-center text-sm font-bold text-brand-orange outline-none"
                          />
                          <button
                            type="button"
                            disabled={envoi || nbAuPanier >= dispo.length}
                            onClick={() => definirQuantitePanier(p, nbAuPanier + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {dispo.length > 0 && (
                    <div className="flex justify-end pt-2 border-t border-brand-light-grey/50">
                      <BoutonImpression 
                        ids={dispo.map(v => v.id)} 
                        dejaImprimee={dispo.every(v => v.etiquette_imprimee)} 
                        className="flex items-center gap-1.5 rounded-lg bg-brand-light-grey/30 px-3 py-1.5 text-xs font-semibold text-brand-black transition hover:bg-brand-light-grey"
                        texte={t("vitrine.imprimer")}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre de vente : récapitulatif du panier, toujours visible */}
      {peutVendre && lignesPanier.length > 0 && (
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-light-grey bg-brand-white/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm text-brand-warm-grey">
            <strong className="text-brand-black">{lignesPanier.length}</strong> {t("vitrine.produitsPanier", { n: lignesPanier.length })} · {t("vitrine.totalPanier")} {" "}
            <strong className="text-brand-orange">{formaterDA(totalPanier)}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanier(new Map())}
              className="btn btn-secondaire"
            >
              {t("vitrine.viderPanier")}
            </button>
            <button type="button" onClick={ouvrirVente} className="btn btn-primaire">
              <IconeBillet taille={15} />
              {t("vitrine.vendreFacturer")}
            </button>
          </div>
        </div>
      )}

      <Modale
        titre={t("vitrine.vendre")}
        ouverte={modalVente}
        onFermer={() => setModalVente(false)}
      >
        <div className="space-y-3">
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-brand-light-grey/25 p-2.5 text-sm">
            {lignesPanier.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate" title={l.reference}>
                  <span className="font-mono text-xs text-brand-warm-grey">{l.code_interne}</span>{" "}
                  {l.reference}
                </span>
                <span className="shrink-0 font-semibold">{formaterDA(l.prix)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            {t("vitrine.totalPanier")} :{" "}
            <strong className="text-lg text-brand-orange">{formaterDA(totalPanier)}</strong>
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-client">
                {t("vitrine.nomClient")}
              </label>
              <input
                id="vitrine-client"
                type="text"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                placeholder="Optionnel — figure sur la facture"
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-tel">
                Téléphone
              </label>
              <input
                id="vitrine-tel"
                type="tel"
                value={clientTel}
                onChange={(e) => setClientTel(e.target.value)}
                placeholder="Optionnel"
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-date">
                Date
              </label>
              <input
                id="vitrine-date"
                type="date"
                value={dateVente}
                max={aujourdhuiIso()}
                onChange={(e) => setDateVente(e.target.value)}
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-canal">
                Canal
              </label>
              <input
                id="vitrine-canal"
                type="text"
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                placeholder="Boutique, Ouedkniss…"
                className="champ"
              />
            </div>
          </div>

          <p className="rounded-lg bg-brand-glow/20 px-3 py-2 text-xs text-brand-smooth">
            La facture est générée automatiquement, avec <strong>6 mois de garantie</strong> sur
            chaque produit vendu.
          </p>

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
                  Revoir
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
                disabled={envoi || lignesPanier.length === 0}
                onClick={() => void enregistrerVente(false)}
                className="btn btn-primaire"
              >
                <IconeBillet taille={15} />
                Enregistrer et créer la facture
              </button>
            )}
          </div>
        </div>
      </Modale>

      {apercuPhotos && (
        <VisionneusePhotos
          photos={apercuPhotos.photos}
          index={apercuPhotos.index}
          onFermer={() => setApercuPhotos(null)}
          onNaviguer={(i) => setApercuPhotos((a) => (a ? { ...a, index: i } : a))}
          lienTelechargement={(i) => `${apercuPhotos.photos[i]}?download=1`}
          titre={apercuPhotos.titre}
        />
      )}
    </div>
  );
}
