"use client";

import { useRef } from "react";
import { formaterDA } from "@/lib/caisse";
import { IconeFermer, IconePlus } from "./icons";

export interface LigneTableur {
  reference: string;
  categorie: string;
  prix_achat: string;
}

export const LIGNE_VIDE: LigneTableur = { reference: "", categorie: "", prix_achat: "" };

export function totalTableur(lignes: LigneTableur[]): number {
  return lignes.reduce((s, l) => {
    const n = Number(l.prix_achat);
    return s + (Number.isFinite(n) ? Math.trunc(n) : 0);
  }, 0);
}

export default function TableurProduits({
  lignes,
  onChange,
  categories,
}: {
  lignes: LigneTableur[];
  onChange: (lignes: LigneTableur[]) => void;
  categories: string[];
}) {
  const conteneur = useRef<HTMLDivElement>(null);

  function modifier(index: number, champ: keyof LigneTableur, valeur: string) {
    onChange(lignes.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterLigne() {
    onChange([...lignes, { ...LIGNE_VIDE }]);
    setTimeout(() => {
      const inputs = conteneur.current?.querySelectorAll<HTMLInputElement>(
        "input[data-champ='reference']"
      );
      inputs?.item(inputs.length - 1)?.focus();
    }, 0);
  }

  function supprimerLigne(index: number) {
    if (lignes.length <= 1) {
      onChange([{ ...LIGNE_VIDE }]);
      return;
    }
    onChange(lignes.filter((_, i) => i !== index));
  }

  function surEntree(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      ajouterLigne();
    }
  }

  const classeCellule =
    "w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-crystal/40 rounded";

  return (
    <div ref={conteneur}>
      <div className="overflow-x-auto rounded-lg border border-brand-light-grey">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-brand-light-grey/25">
            <tr>
              <th className="entete-table w-8 px-2 py-2">#</th>
              <th className="entete-table px-2 py-2">Référence *</th>
              <th className="entete-table w-44 px-2 py-2">Catégorie *</th>
              <th className="entete-table w-36 px-2 py-2">Prix achat (DA) *</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="">
            {lignes.map((ligne, i) => (
              <tr key={i} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                <td className="px-2 py-1 text-xs text-brand-grey">{i + 1}</td>
                <td>
                  <input
                    data-champ="reference"
                    type="text"
                    value={ligne.reference}
                    onChange={(e) => modifier(i, "reference", e.target.value)}
                    onKeyDown={surEntree}
                    placeholder="Ex. Dell Latitude 5480 i5 8Go/256Go"
                    className={classeCellule}
                  />
                </td>
                <td>
                  <input
                    data-champ="categorie"
                    type="text"
                    list="categories-existantes"
                    value={ligne.categorie}
                    onChange={(e) => modifier(i, "categorie", e.target.value)}
                    onKeyDown={surEntree}
                    placeholder="Laptop, Écran…"
                    className={classeCellule}
                  />
                </td>
                <td>
                  <input
                    data-champ="prix"
                    type="number"
                    min={0}
                    step={1}
                    value={ligne.prix_achat}
                    onChange={(e) => modifier(i, "prix_achat", e.target.value)}
                    onKeyDown={surEntree}
                    placeholder="0"
                    className={`${classeCellule} text-right`}
                  />
                </td>
                <td className="px-1 text-center">
                  <button
                    type="button"
                    onClick={() => supprimerLigne(i)}
                    aria-label={`Supprimer la ligne ${i + 1}`}
                    className="rounded-md p-1.5 text-brand-grey transition hover:bg-danger/10 hover:text-danger"
                  >
                    <IconeFermer taille={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="categories-existantes">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={ajouterLigne} className="btn btn-secondaire">
          <IconePlus taille={14} />
          Ajouter une ligne (Entrée)
        </button>
        <p className="text-sm">
          Total : <span className="font-bold">{formaterDA(totalTableur(lignes))}</span>
        </p>
      </div>
    </div>
  );
}
