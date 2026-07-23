"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  IconeImage,
  IconeVitrine,
  IconeChevronGauche,
  IconeChevronDroite,
} from "@/components/icons";

interface LigneVitrine {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  image_url: string | null;
  nb_images: number;
}

interface ReponseInventaire {
  total: number;
  pages: number;
  page: number;
  produits: LigneVitrine[];
}

export default function Vitrine({ role }: { role: Role }) {
  const { afficher } = useToast();
  const [donnees, setDonnees] = useState<ReponseInventaire | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [envoi, setEnvoi] = useState(false);

  const peutRetirer = role === "gerant" || role === "technicien" || role === "dev";

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const res = await fetch(`/api/produits?en_vitrine=1&tri=reference&page=${page}`);
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement de la vitrine.");
      }
      setDonnees((await res.json()) as ReponseInventaire);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, [page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function retirer(id: number, code: string) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/produits/masse/vitrine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], en_vitrine: false }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du retrait.", "erreur");
        return;
      }
      afficher(`${code} retiré de la vitrine.`);
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
            Produits exposés physiquement en vitrine — indépendant de la mise en vente en ligne.
          </p>
        </div>
        {produits.length > 0 && (
          <a
            href="/api/produits/images/export?en_vitrine=1"
            className="btn btn-secondaire"
            title="Télécharger les photos des produits en vitrine (archive ZIP organisée)"
          >
            <IconeImage taille={15} />
            Photos (ZIP)
          </a>
        )}
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black">{donnees.total}</strong> produit
          {donnees.total > 1 ? "s" : ""} en vitrine
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
            pour signaler qu&apos;il est exposé.
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
                <Link href={`/produits/${p.id}`} className="relative block aspect-square bg-brand-paper">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={`Photo de ${p.reference}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-brand-grey">
                      <IconeImage taille={28} />
                    </span>
                  )}
                  {p.nb_images > 1 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-brand-white">
                      <IconeImage taille={11} />
                      {p.nb_images}
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-brand-warm-grey">{p.code_interne}</span>
                    <BadgeStatut statut={p.statut} />
                  </div>
                  <Link
                    href={`/produits/${p.id}`}
                    className="line-clamp-2 text-sm font-semibold transition hover:text-brand-crystal"
                    title={p.reference}
                  >
                    {p.reference}
                  </Link>
                  <p className="text-xs text-brand-warm-grey">{p.categorie}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                    <span className="font-bold text-brand-orange">
                      {prix !== null ? formaterDA(prix) : "—"}
                    </span>
                    {peutRetirer && (
                      <button
                        type="button"
                        disabled={envoi}
                        onClick={() => void retirer(p.id, p.code_interne)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                        title="Retirer de la vitrine"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {donnees && donnees.pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((n) => Math.max(1, n - 1))}
            className="btn btn-secondaire"
          >
            <IconeChevronGauche taille={15} />
            Précédent
          </button>
          <span className="px-2 text-brand-warm-grey">
            Page {donnees.page} / {donnees.pages}
          </span>
          <button
            type="button"
            disabled={page >= donnees.pages}
            onClick={() => setPage((n) => n + 1)}
            className="btn btn-secondaire"
          >
            Suivant
            <IconeChevronDroite taille={15} />
          </button>
        </div>
      )}
    </div>
  );
}
