"use client";

import { useState, useEffect } from "react";
import Modale from "@/components/Modale";
import { Plus, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/components/toast";

interface ProduitClassification {
  id: number;
  reference: string;
  code_interne: string;
  categorie: string;
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

  const [modeCreation, setModeCreation] = useState<"none" | "famille" | "categorie" | "sous-categorie" | "modele">("none");
  const [nomCreation, setNomCreation] = useState("");
  const [parentIdCreation, setParentIdCreation] = useState<number | null>(null);

  const fetchCategories = () => {
    fetch("/api/categories")
      .then(res => res.json())
      .then(data => setCategoriesTree(data))
      .catch(console.error);
  };

  const fetchModeles = (cibleId: number) => {
    fetch(`/api/modeles?categorie_id=${cibleId}`)
      .then(res => res.json())
      .then(data => setModeles(data))
      .catch(console.error);
  };

  useEffect(() => {
    if (ouverte) fetchCategories();
  }, [ouverte]);

  useEffect(() => {
    const cibleId = sousCategorieId || categorieId || familleId;
    if (cibleId) {
      fetchModeles(Number(cibleId));
    } else {
      setModeles([]);
    }
  }, [familleId, categorieId, sousCategorieId]);

  useEffect(() => { setCategorieId(""); setSousCategorieId(""); setModeleId(""); }, [familleId]);
  useEffect(() => { setSousCategorieId(""); setModeleId(""); }, [categorieId]);
  useEffect(() => { setModeleId(""); }, [sousCategorieId]);

  const familleSelect = categoriesTree.find(f => f.id === familleId);
  const categorieSelect = familleSelect?.enfants?.find(c => c.id === categorieId);

  const ouvrirCreation = (type: "famille" | "categorie" | "sous-categorie" | "modele", parentId: number | null) => {
    setModeCreation(type);
    setNomCreation("");
    setParentIdCreation(parentId);
  };

  const annulerCreation = () => {
    setModeCreation("none");
    setNomCreation("");
    setParentIdCreation(null);
  };

  const confirmerCreation = async () => {
    if (!nomCreation.trim()) return;
    setErreur(null);

    try {
      if (modeCreation === "modele") {
        const res = await fetch("/api/modeles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom: nomCreation.trim(), categorie_id: parentIdCreation })
        });
        if (!res.ok) throw new Error("Erreur lors de la création du modèle");
        const data = await res.json();
        fetchModeles(Number(parentIdCreation));
        setModeleId(data.id);
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom: nomCreation.trim(), parent_id: parentIdCreation })
        });
        if (!res.ok) throw new Error("Erreur lors de la création de la catégorie");
        const data = await res.json();
        fetchCategories();
        if (!parentIdCreation) setFamilleId(data.id);
        else if (parentIdCreation === familleId) setCategorieId(data.id);
        else setSousCategorieId(data.id);
      }
      annulerCreation();
    } catch (err: any) {
      setErreur(err.message);
    }
  };

  const labelsCreation: Record<string, string> = {
    famille: "Nouvelle famille",
    categorie: "Nouvelle catégorie",
    "sous-categorie": "Nouvelle sous-catégorie",
    modele: "Nouveau modèle",
  };

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
          <div className="rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 p-4 flex items-center gap-3">
            {produits[0]!.image_url ? (
              <img src={produits[0]!.image_url} alt="" className="w-16 h-16 object-cover rounded-xl" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-brand-light-grey/20 dark:bg-white/10 flex items-center justify-center text-brand-warm-grey">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div>
              <p className="font-semibold">{produits[0]!.reference}</p>
              <p className="text-xs text-brand-warm-grey">Code: {produits[0]!.code_interne}</p>
              <p className="text-xs text-brand-warm-grey">Catégorie brute: {produits[0]!.categorie}</p>
            </div>
          </div>
        )}

        {produits.length > 1 && (
          <div className="rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 p-4 text-center font-extrabold text-xs uppercase tracking-wider text-brand-warm-grey">
            {produits.length} produits sélectionnés
          </div>
        )}

        {erreur && (
          <div className="rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2 p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {erreur}
          </div>
        )}

        <form onSubmit={soumettre} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">Famille</label>
            <div className="flex gap-2">
              <select className="champ flex-1" value={familleId} onChange={(e) => setFamilleId(Number(e.target.value) || "")} required>
                <option value="">Sélectionner une famille...</option>
                {categoriesTree.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
              <button type="button" onClick={() => ouvrirCreation("famille", null)} className="btn btn-secondaire shrink-0 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center" title="Créer une famille">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {modeCreation === "famille" && (
              <div className="mt-2 rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/5 p-3 space-y-2">
                <input
                  type="text"
                  className="champ w-full"
                  placeholder="Nom de la famille..."
                  value={nomCreation}
                  onChange={(e) => setNomCreation(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmerCreation(); } if (e.key === "Escape") annulerCreation(); }}
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={annulerCreation} className="btn btn-secondaire text-xs">Annuler</button>
                  <button type="button" onClick={confirmerCreation} className="btn btn-primaire text-xs">Créer</button>
                </div>
              </div>
            )}
          </div>

          {familleId && (
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">Catégorie</label>
              <div className="flex gap-2">
                <select className="champ flex-1" value={categorieId} onChange={(e) => setCategorieId(Number(e.target.value) || "")}>
                  <option value="">Aucune catégorie précise</option>
                  {familleSelect?.enfants?.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <button type="button" onClick={() => ouvrirCreation("categorie", Number(familleId))} className="btn btn-secondaire shrink-0 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center" title="Créer une catégorie">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {modeCreation === "categorie" && (
                <div className="mt-2 rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/5 p-3 space-y-2">
                  <input
                    type="text"
                    className="champ w-full"
                    placeholder="Nom de la catégorie..."
                    value={nomCreation}
                    onChange={(e) => setNomCreation(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmerCreation(); } if (e.key === "Escape") annulerCreation(); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={annulerCreation} className="btn btn-secondaire text-xs">Annuler</button>
                    <button type="button" onClick={confirmerCreation} className="btn btn-primaire text-xs">Créer</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {categorieId && (
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">Sous-catégorie</label>
              <div className="flex gap-2">
                <select className="champ flex-1" value={sousCategorieId} onChange={(e) => setSousCategorieId(Number(e.target.value) || "")}>
                  <option value="">Aucune sous-catégorie précise</option>
                  {categorieSelect?.enfants?.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.nom}</option>
                  ))}
                </select>
                <button type="button" onClick={() => ouvrirCreation("sous-categorie", Number(categorieId))} className="btn btn-secondaire shrink-0 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center" title="Créer une sous-catégorie">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {modeCreation === "sous-categorie" && (
                <div className="mt-2 rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/5 p-3 space-y-2">
                  <input
                    type="text"
                    className="champ w-full"
                    placeholder="Nom de la sous-catégorie..."
                    value={nomCreation}
                    onChange={(e) => setNomCreation(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmerCreation(); } if (e.key === "Escape") annulerCreation(); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={annulerCreation} className="btn btn-secondaire text-xs">Annuler</button>
                    <button type="button" onClick={confirmerCreation} className="btn btn-primaire text-xs">Créer</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(familleId || categorieId || sousCategorieId) && (
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">Modèle (optionnel)</label>
              <div className="flex gap-2">
                <select className="champ flex-1" value={modeleId} onChange={(e) => setModeleId(Number(e.target.value) || "")}>
                  <option value="">Aucun modèle précis (Générique)</option>
                  {modeles.map(m => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
                <button type="button" onClick={() => ouvrirCreation("modele", Number(sousCategorieId || categorieId || familleId))} className="btn btn-secondaire shrink-0 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center" title="Créer un modèle">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {modeCreation === "modele" && (
                <div className="mt-2 rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/5 p-3 space-y-2">
                  <input
                    type="text"
                    className="champ w-full"
                    placeholder="Nom du modèle..."
                    value={nomCreation}
                    onChange={(e) => setNomCreation(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmerCreation(); } if (e.key === "Escape") annulerCreation(); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={annulerCreation} className="btn btn-secondaire text-xs">Annuler</button>
                    <button type="button" onClick={confirmerCreation} className="btn btn-primaire text-xs">Créer</button>
                  </div>
                </div>
              )}
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
