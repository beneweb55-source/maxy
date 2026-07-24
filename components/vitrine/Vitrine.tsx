"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { IconeImage, IconeTelechargement, IconeVitrine } from "@/components/icons";

// Une carte = un MODÈLE exposé (référence + catégorie), avec la quantité
// d'exemplaires identiques en stock — pas une carte par unité.
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
}

interface ReponseVitrine {
  total: number;
  produits: CarteVitrine[];
}

export default function Vitrine({ role }: { role: Role }) {
  const { afficher } = useToast();
  const [donnees, setDonnees] = useState<ReponseVitrine | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [apercuPhotos, setApercuPhotos] = useState<{
    photos: string[];
    index: number;
    titre: string;
  } | null>(null);

  const peutRetirer = role === "gerant" || role === "technicien" || role === "dev";

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

  const produits = donnees?.produits ?? [];

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-extrabold tracking-tight text-brand-black">
            <IconeVitrine taille={26} />
            Vitrine
          </h1>
          <p className="mt-1 text-sm text-brand-warm-grey">
            Modèles exposés physiquement en vitrine — un article représente tous ses exemplaires
            identiques en stock.
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
          <strong className="text-brand-black">{donnees.total}</strong> modèle
          {donnees.total > 1 ? "s" : ""} en vitrine ·{" "}
          <strong className="text-brand-black">
            {produits.reduce((s, p) => s + p.quantite, 0)}
          </strong>{" "}
          exemplaire{produits.reduce((s, p) => s + p.quantite, 0) > 1 ? "s" : ""} en stock
        </p>
      )}

      {!erreur && donnees === null && (
        <p className="text-sm text-brand-warm-grey">Chargement de la vitrine…</p>
      )}

      {donnees && produits.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <IconeVitrine taille={32} className="mx-auto mb-3 text-brand-grey" />
          <p className="font-semibold text-brand-black">Aucun produit en vitrine.</p>
          <p className="mt-1">
            Depuis la fiche d&apos;un produit ou l&apos;inventaire, utilisez « Mettre en vitrine »
            sur un seul exemplaire : il représentera tout le stock du modèle.
          </p>
          <Link href="/inventaire" className="btn btn-primaire mt-4">
            Aller à l&apos;inventaire
          </Link>
        </div>
      )}

      {produits.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {produits.map((p) => {
            const prix = p.prix_vente_reel ?? p.prix_vente_fixe;
            return (
              <div
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-brand-light-grey bg-brand-white transition hover:shadow-md"
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
                      className="absolute left-2 top-2 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-brand-white shadow"
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
                        · {p.quantite} en stock
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
                      {peutRetirer && (
                        <button
                          type="button"
                          disabled={envoi}
                          onClick={() => void retirer(p)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                          title="Retirer ce modèle de la vitrine"
                        >
                          Retirer
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
