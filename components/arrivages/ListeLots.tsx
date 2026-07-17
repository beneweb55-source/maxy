"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role, StatutLot } from "@prisma/client";
import { INFOS_STATUT_LOT } from "@/lib/statuts";
import { formaterDA } from "@/lib/caisse";
import { IconePlus } from "@/components/icons";

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
  const [lots, setLots] = useState<LigneLot[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  
  const [rechercheFournisseur, setRechercheFournisseur] = useState("");
  const [triOrdre, setTriOrdre] = useState<"desc" | "asc">("desc");
  const [filtreStatut, setFiltreStatut] = useState<StatutLot | "tous">("tous");

  useEffect(() => {
    let annule = false;
    fetch("/api/lots")
      .then(async (res) => {
        if (!res.ok) {
          const corps = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(corps?.error ?? "Erreur lors du chargement des lots.");
        }
        return res.json() as Promise<{ lots: LigneLot[] }>;
      })
      .then((d) => {
        if (!annule) setLots(d.lots);
      })
      .catch((e: Error) => {
        if (!annule) setErreur(e.message);
      });

    return () => {
      annule = true;
    };
  }, []);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1>Arrivages</h1>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-light-grey/50">
              {lotsFiltres.map((lot) => {
                const pct =
                  lot.nb_produits > 0 ? Math.round((lot.nb_testes / lot.nb_produits) * 100) : 0;
                const infos = INFOS_STATUT_LOT[lot.statut_lot];
                return (
                  <tr
                    key={lot.id}
                    onClick={() => router.push(`/lots/${lot.id}`)}
                    className="cursor-pointer transition hover:bg-brand-glow/15"
                  >
                    <td className="px-3 py-2.5 font-bold">n°{lot.id}</td>
                    <td className="px-3 py-2.5">
                      {new Date(lot.date_entree).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{lot.fournisseur}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
