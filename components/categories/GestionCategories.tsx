"use client";

import { useState, useEffect } from "react";
import { IconePlus, IconeCrayon, IconeCorbeille, IconeArchive, IconeAlerte, IconeFermer } from "@/components/icons";

interface Categorie {
  id: number;
  nom: string;
  parent_id: number | null;
  image_url: string | null;
  description: string | null;
  enfants?: Categorie[];
  _count?: { modeles: number; enfants?: number };
}

export default function GestionCategories() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [modalOuverte, setModalOuverte] = useState(false);
  const [categorieEditee, setCategorieEditee] = useState<Categorie | null>(null);
  const [parentIdPourAjout, setParentIdPourAjout] = useState<number | null>(null);

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    chargerCategories();
  }, []);

  async function chargerCategories() {
    setChargement(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setCategories(data);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }

  function ouvrirAjout(parentId: number | null = null) {
    setCategorieEditee(null);
    setParentIdPourAjout(parentId);
    setNom("");
    setDescription("");
    setModalOuverte(true);
  }

  function ouvrirEdition(cat: Categorie) {
    setCategorieEditee(cat);
    setParentIdPourAjout(cat.parent_id);
    setNom(cat.nom);
    setDescription(cat.description || "");
    setModalOuverte(true);
  }

  async function sauvegarder(e: React.FormEvent) {
    e.preventDefault();
    if (envoi || !nom.trim()) return;
    setEnvoi(true);

    try {
      const url = categorieEditee ? `/api/categories/${categorieEditee.id}` : "/api/categories";
      const methode = categorieEditee ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          description,
          parent_id: parentIdPourAjout
        })
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur lors de la sauvegarde");
      }

      await chargerCategories();
      setModalOuverte(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(cat: Categorie) {
    if (cat._count?.enfants || (cat.enfants && cat.enfants.length > 0)) {
      alert("Impossible de supprimer une catégorie qui contient des sous-catégories.");
      return;
    }
    
    if (cat._count?.modeles && cat._count.modeles > 0) {
      alert("Impossible de supprimer une catégorie qui contient des modèles.");
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer la catégorie "${cat.nom}" ?`)) return;

    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur lors de la suppression");
      }
      await chargerCategories();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function RenduNoeud({ cat, niveau = 0 }: { cat: Categorie, niveau?: number }) {
    return (
      <div className="w-full">
        <div className={`flex items-center justify-between p-3 border-b border-brand-light-grey/30 dark:border-white/5 hover:bg-brand-light-grey/10 dark:hover:bg-white/5 transition-colors group ${niveau === 0 ? 'bg-white dark:bg-brand-paper shadow-sm rounded-lg mb-2 border' : ''}`}>
          <div className="flex items-center gap-3" style={{ paddingLeft: `${niveau * 1.5}rem` }}>
            <div className="text-brand-orange">
              {niveau === 0 ? <IconeArchive taille={20} /> : <div className="w-4 border-b-2 border-brand-light-grey/50 dark:border-white/20 ml-1"></div>}
            </div>
            <div>
              <div className="font-bold text-brand-black dark:text-white font-outfit">{cat.nom}</div>
              {cat.description && <div className="text-xs text-brand-warm-grey truncate max-w-xs">{cat.description}</div>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => ouvrirAjout(cat.id)}
              className="p-1.5 text-brand-black dark:text-white bg-brand-light-grey/20 dark:bg-white/10 rounded hover:bg-brand-orange hover:text-white transition-colors"
              title="Ajouter une sous-catégorie"
            >
              <IconePlus taille={14} />
            </button>
            <button
              onClick={() => ouvrirEdition(cat)}
              className="p-1.5 text-brand-black dark:text-white bg-brand-light-grey/20 dark:bg-white/10 rounded hover:bg-brand-orange hover:text-white transition-colors"
              title="Modifier"
            >
              <IconeCrayon taille={14} />
            </button>
            <button
              onClick={() => supprimer(cat)}
              className="p-1.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-500 hover:text-white transition-colors"
              title="Supprimer"
            >
              <IconeCorbeille taille={14} />
            </button>
          </div>
        </div>

        {cat.enfants && cat.enfants.length > 0 && (
          <div className="w-full">
            {cat.enfants.map(enfant => (
              <RenduNoeud key={enfant.id} cat={enfant} niveau={niveau + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (chargement) return <div className="p-8 text-center text-brand-warm-grey">Chargement de l'arborescence...</div>;
  if (erreur) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">{erreur}</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-brand-black dark:text-white">Arborescence</h2>
        <button
          onClick={() => ouvrirAjout(null)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-md"
        >
          <IconePlus taille={16} /> Ajouter une racine
        </button>
      </div>

      <div className="w-full space-y-1 bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-brand-light-grey/50 dark:border-white/5">
        {categories.length === 0 ? (
          <div className="text-center p-8 text-brand-warm-grey">Aucune catégorie existante.</div>
        ) : (
          categories.map(cat => <RenduNoeud key={cat.id} cat={cat} />)
        )}
      </div>

      {/* MODAL AJOUT/EDITION */}
      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-brand-paper w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-entree-rapide">
            <div className="flex items-center justify-between p-4 border-b border-brand-light-grey dark:border-white/10">
              <h3 className="font-bold text-lg text-brand-black dark:text-white font-outfit">
                {categorieEditee ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </h3>
              <button onClick={() => setModalOuverte(false)} className="p-2 text-brand-warm-grey hover:text-brand-black dark:hover:text-white bg-brand-light-grey/20 dark:bg-white/5 rounded-full transition-colors">
                <IconeFermer taille={16} />
              </button>
            </div>
            
            <form onSubmit={sauvegarder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-black dark:text-white mb-1.5">Nom de la catégorie *</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full px-4 py-2 bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  placeholder="Ex: Stockage"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-black dark:text-white mb-1.5">Description (optionnel)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none h-24"
                  placeholder="Courte description de cette famille..."
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  className="px-4 py-2 text-brand-black dark:text-white font-bold bg-brand-light-grey/50 dark:bg-white/10 rounded-lg hover:bg-brand-light-grey dark:hover:bg-white/20 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoi || !nom.trim()}
                  className="px-6 py-2 bg-brand-orange text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {envoi ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
