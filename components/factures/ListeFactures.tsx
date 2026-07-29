"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import {
  IconeBouclier,
  IconeChevronGauche,
  IconeChevronDroite,
  IconeRecherche,
} from "@/components/icons";

interface LigneFactureListe {
  id: number;
  numero: string;
  date_emission: string;
  client_nom: string | null;
  total: number;
  garantie_fin: string;
  annulee: boolean;
  canal: string | null;
  vendeur: string;
  nb_lignes: number;
}

interface ReponseFactures {
  total: number;
  page: number;
  pages: number;
  factures: LigneFactureListe[];
}

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function ListeFactures() {
  const router = useRouter();
  const [donnees, setDonnees] = useState<ReponseFactures | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [mois, setMois] = useState("");
  const [page, setPage] = useState(1);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const params = new URLSearchParams();
      if (recherche) params.set("q", recherche);
      if (mois) params.set("mois", mois);
      params.set("page", String(page));
      const res = await fetch(`/api/factures?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement des factures.");
      }
      setDonnees((await res.json()) as ReponseFactures);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, [recherche, mois, page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const factures = donnees?.factures ?? [];
  const maintenant = Date.now();

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Factures</h1>
          <p className="mt-1 text-sm text-brand-warm-grey">
            Générées automatiquement à chaque vente, avec 6 mois de garantie.
          </p>
        </div>
      </div>

      <div className="carte flex flex-wrap items-center gap-3">
        <form
          className="relative min-w-56 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setRecherche(q.trim());
          }}
        >
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey">
            <IconeRecherche taille={15} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° facture, client, produit puis Entrée"
            className="champ pl-9"
          />
        </form>
        <input
          type="month"
          value={mois}
          onChange={(e) => {
            setPage(1);
            setMois(e.target.value);
          }}
          className="champ w-auto"
        />
        {(recherche || mois) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setRecherche("");
              setMois("");
              setPage(1);
            }}
            className="text-sm text-brand-warm-grey hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}
      {!erreur && donnees === null && (
        <p className="text-sm text-brand-warm-grey">Chargement des factures…</p>
      )}

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black">{donnees.total}</strong> facture
          {donnees.total > 1 ? "s" : ""}
        </p>
      )}

      {donnees && factures.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <p className="font-semibold text-brand-black">Aucune facture.</p>
          <p className="mt-1">
            Chaque vente enregistrée (à l&apos;unité ou groupée) génère automatiquement sa facture.
          </p>
          <Link href="/vitrine" className="btn btn-primaire mt-4">
            Vendre depuis la vitrine
          </Link>
        </div>
      )}

      {factures.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-brand-light-grey/25">
              <tr>
                <th className="entete-table">N°</th>
                <th className="entete-table">Date</th>
                <th className="entete-table">Client</th>
                <th className="entete-table text-right">Articles</th>
                <th className="entete-table">Garantie</th>
                <th className="entete-table">Vendeur</th>
                <th className="entete-table text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => {
                const garantieActive = new Date(f.garantie_fin).getTime() > maintenant;
                return (
                  <tr
                    key={f.id}
                    onClick={() => router.push(`/factures/${f.id}`)}
                    className={`ligne-table border-b border-brand-light-grey/30 last:border-0 cursor-pointer ${
                      f.annulee ? "text-brand-grey" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-brand-orange">
                      {f.numero}
                      {f.annulee && (
                        <span className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-[10px] font-semibold text-danger">
                          annulée
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{dateFr(f.date_emission)}</td>
                    <td className="px-3 py-2.5">
                      {f.client_nom || <span className="text-brand-grey">Client comptoir</span>}
                      {f.canal && (
                        <span className="block text-xs text-brand-grey">{f.canal}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">{f.nb_lignes}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          garantieActive
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-brand-light-grey/60 text-brand-warm-grey"
                        }`}
                        title={`Garantie jusqu'au ${dateFr(f.garantie_fin)}`}
                      >
                        <IconeBouclier taille={11} />
                        {garantieActive ? `→ ${dateFr(f.garantie_fin)}` : "expirée"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{f.vendeur}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{formaterDA(f.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
