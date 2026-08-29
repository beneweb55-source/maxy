"use client";

import { useState, useEffect } from "react";
import Modale from "@/components/Modale";
import { IconeRecherche, IconePlus } from "@/components/icons";

interface ProduitClassification {
  id: number;
  reference: string;
  code_interne: string;
  categorie: string; // legacy category
  image_url: string | null;
}

interface CategorieNode {
  id: number;
  nom: string;
  parent_id: number | null;
  enfants: CategorieNode[];
}

interface ModeleNode {
  id: number;
  nom: string;
  categorie_id: number;
}

export default function ModalClassification({
  produits,
  ouverte,
  onFermer,
  onSucces,
}: {
  produits: ProduitClassification[];
  ouverte: boolean;
  onFermer: () => void;
  onSucces: () => void;
}) {
  const [categoriesTree, setCategoriesTree] = useState<CategorieNode[]>([]);
  const [modeles, setModeles] = useState<ModeleNode[]>([]);
  
  const [familleId, setFamilleId] = useState<number | "">("");
  const [categorieId, setCategorieId] = useState<number | "">("");
  const [sousCategorieId, setSousCategorieId] = useState<number | "">("");
  const [modeleId, setModeleId] = useState<number | "">("");
  
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Charger l'arbre au montage
  useEffect(() => {
    if (!ouverte) return;
    fetch("/api/categories")
      .then(res => res.json())
      .then(data => setCategoriesTree(data))
      .catch(console.error);
  }, [ouverte]);

  // Charger les modèles quand la catégorie/sous-catégorie la plus profonde change
  useEffect(() => {
    const cibleId = sousCategorieId || categorieId || familleId;
    if (cibleId) {
      fetch(`/api/modeles?categorie_id=${cibleId}`)
        .then(res => res.json())
        .then(data => setModeles(data))
        .catch(console.error);
    } else {
      setModeles([]);
    }
  }, [familleId, categorieId, sousCategorieId]);

  // Reset enfants quand parent change
  useEffect(() => { setCategorieId(""); setSousCategorieId(""); setModeleId(""); }, [familleId]);
  useEffect(() => { setSousCategorieId(""); setModeleId(""); }, [categorieId]);
  useEffect(() => { setModeleId(""); }, [sousCategorieId]);

  const familleSelect = categoriesTree.find(f => f.id === familleId);
  const categorieSelect = familleSelect?.enfants?.find(c => c.id === categorieId);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familleId) {
      setErreur("Veuillez sélectionner au moins une famille.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch("/api/produits/classification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produit_ids: produits.map(p => p.id),
          famille_id: familleId,
          categorie_id: categorieId || null,
          sous_categorie_id: sousCategorieId || null,
          modele_id: modeleId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de classification");
      onSucces();
      onFermer();
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modale
      titre={produits.length === 1 ? "Modifier la classification" : "Classification en masse"}
      ouverte={ouverte}
      onFermer={onFermer}
    >
      <div className="space-y-4">
        {produits.length === 1 && (
          <div className="p-3 bg-brand-super-light-grey rounded-lg border border-brand-light-grey flex items-start gap-3">
            {produits[0]!.image_url ? (
              <img src={produits[0]!.image_url} alt="" className="w-16 h-16 object-cover rounded" />
            ) : (
              <div className="w-16 h-16 bg-brand-light-grey rounded flex items-center justify-center text-brand-warm-grey">
                <IconeRecherche />
              </div>
            )}
            <div>
              <p className="font-semibold">{produits[0]!.reference}</p>
              <p className="text-sm text-brand-warm-grey">Code: {produits[0]!.code_interne}</p>
              <p className="text-sm text-brand-warm-grey">Catégorie brute: {produits[0]!.categorie}</p>
            </div>
          </div>
        )}
        
        {produits.length > 1 && (
          <div className="p-3 bg-brand-super-light-grey rounded-lg border border-brand-light-grey text-center font-semibold">
            {produits.length} produits sélectionnés
          </div>
        )}

        {erreur && <div className="text-red-500 text-sm font-medium">{erreur}</div>}

        <form onSubmit={soumettre} className="space-y-3">
          <div>
            <label className="libelle">Famille</label>
            <div className="flex gap-2">
              <select className="champ flex-1" value={familleId} onChange={(e) => setFamilleId(Number(e.target.value) || "")} required>
                <option value="">Sélectionner une famille...</option>
                {categoriesTree.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {familleId && (
            <div>
              <label className="libelle">Catégorie</label>
              <div className="flex gap-2">
                <select className="champ flex-1" value={categorieId} onChange={(e) => setCategorieId(Number(e.target.value) || "")}>
                  <option value="">Aucune catégorie précise</option>
                  {familleSelect?.enfants?.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {categorieId && (
            <div>
              <label className="libelle">Sous-catégorie</label>
              <div className="flex gap-2">
                <select className="champ flex-1" value={sousCategorieId} onChange={(e) => setSousCategorieId(Number(e.target.value) || "")}>
                  <option value="">Aucune sous-catégorie précise</option>
                  {categorieSelect?.enfants?.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(familleId || categorieId || sousCategorieId) && (
            <div>
              <label className="libelle">Modèle (optionnel)</label>
              <div className="flex gap-2">
                <select className="champ flex-1" value={modeleId} onChange={(e) => setModeleId(Number(e.target.value) || "")}>
                  <option value="">Aucun modèle précis (Générique)</option>
                  {modeles.map(m => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <button type="button" onClick={onFermer} className="btn btn-secondaire" disabled={envoi}>Annuler</button>
            <button type="submit" className="btn btn-primaire" disabled={envoi}>
              {envoi ? "Enregistrement..." : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </Modale>
  );
}
