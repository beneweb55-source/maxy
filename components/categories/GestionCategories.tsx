"use client";

import { useState, useEffect } from "react";
import { 
  Folder, 
  Layers, 
  Tag, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Package, 
  Check, 
  AlertCircle,
  Laptop,
  HardDrive,
  Server,
  Zap,
  Cpu,
  Printer,
  Monitor,
  CircuitBoard,
  Globe
} from "lucide-react";

interface SousCategorie {
  id: number;
  nom: string;
  parent_id: number | null;
  description: string | null;
  image_url: string | null;
  attributs_schema: any | null;
  _count?: { modeles: number; produits: number };
}

interface Categorie {
  id: number;
  nom: string;
  parent_id: number | null;
  description: string | null;
  image_url: string | null;
  ordre: number;
  enfants?: SousCategorie[];
  _count?: { modeles: number; produits: number; enfants: number };
}

interface Famille {
  id: number;
  nom: string;
  parent_id: null;
  description: string | null;
  image_url: string | null;
  ordre: number;
  enfants?: Categorie[];
  _count?: { modeles: number; produits: number; enfants: number };
}

export default function GestionCategories() {
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [familleActiveId, setFamilleActiveId] = useState<number | null>(null);
  const [categorieActiveId, setCategorieActiveId] = useState<number | null>(null);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);

  // Modale générique Ajout / Édition
  const [modalOuverte, setModalOuverte] = useState(false);
  const [typeEntite, setTypeEntite] = useState<"famille" | "categorie" | "sous_categorie">("famille");
  const [entiteEditee, setEntiteEditee] = useState<{ id: number; nom: string; description: string | null; parent_id: number | null } | null>(null);
  const [formNom, setFormNom] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    if (modalOuverte) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [modalOuverte]);

  async function chargerDonnees() {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/categories?tree=1");
      if (!res.ok) throw new Error("Erreur de chargement des données");
      const data: Famille[] = await res.json();
      setFamilles(data);

      // Conserver ou initialiser la famille active
      if (data && data.length > 0 && data[0]) {
        if (!familleActiveId || !data.some(f => f.id === familleActiveId)) {
          setFamilleActiveId(data[0].id);
          setCategorieActiveId(data[0].enfants?.[0]?.id || null);
        }
      }
    } catch (e: any) {
      console.error(e);
      setErreur(e.message || "Erreur réseau");
    } finally {
      setChargement(false);
    }
  }

  const familleActive = familles.find((f) => f.id === familleActiveId) || null;
  const categoriesFamille = familleActive?.enfants || [];
  const categorieActive = categoriesFamille.find((c) => c.id === categorieActiveId) || null;
  const sousCategories = categorieActive?.enfants || [];

  function ouvrirAjoutFamille() {
    setTypeEntite("famille");
    setEntiteEditee(null);
    setFormNom("");
    setFormDesc("");
    setModalOuverte(true);
  }

  function ouvrirAjoutCategorie() {
    if (!familleActiveId) return;
    setTypeEntite("categorie");
    setEntiteEditee(null);
    setFormNom("");
    setFormDesc("");
    setModalOuverte(true);
  }

  function ouvrirAjoutSousCategorie() {
    if (!categorieActiveId) return;
    setTypeEntite("sous_categorie");
    setEntiteEditee(null);
    setFormNom("");
    setFormDesc("");
    setModalOuverte(true);
  }

  function ouvrirEdition(item: { id: number; nom: string; description: string | null; parent_id: number | null }, type: "famille" | "categorie" | "sous_categorie") {
    setTypeEntite(type);
    setEntiteEditee(item);
    setFormNom(item.nom);
    setFormDesc(item.description || "");
    setModalOuverte(true);
  }

  async function sauvegarder(e: React.FormEvent) {
    e.preventDefault();
    if (envoi || !formNom.trim()) return;
    setEnvoi(true);

    try {
      let parentId: number | null = null;
      if (typeEntite === "categorie") parentId = familleActiveId;
      if (typeEntite === "sous_categorie") parentId = categorieActiveId;

      const url = entiteEditee ? `/api/categories/${entiteEditee.id}` : "/api/categories";
      const methode = entiteEditee ? "PUT" : "POST";

      const res = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formNom.trim(),
          description: formDesc.trim() || null,
          parent_id: entiteEditee ? entiteEditee.parent_id : parentId,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur de sauvegarde");
      }

      await chargerDonnees();
      setModalOuverte(false);
      notifier("Modifications enregistrées avec succès.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(item: { id: number; nom: string; _count?: { modeles?: number; produits?: number; enfants?: number } }) {
    const totalEnfants = item._count?.enfants || 0;
    const totalProduits = item._count?.produits || 0;
    const totalModeles = item._count?.modeles || 0;

    if (totalEnfants > 0) {
      alert(`Impossible de supprimer "${item.nom}" : elle contient ${totalEnfants} élément(s) rattaché(s).`);
      return;
    }
    if (totalProduits > 0 || totalModeles > 0) {
      alert(`Impossible de supprimer "${item.nom}" : des produits (${totalProduits}) ou modèles (${totalModeles}) y sont rattachés.`);
      return;
    }

    if (!confirm(`Confirmez-vous la suppression définitive de "${item.nom}" ?`)) return;

    try {
      const res = await fetch(`/api/categories/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erreur lors de la suppression");
      }
      await chargerDonnees();
      notifier(`"${item.nom}" supprimé.`);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function deplacerFamille(index: number, direction: "up" | "down") {
    const cibleIndex = direction === "up" ? index - 1 : index + 1;
    if (cibleIndex < 0 || cibleIndex >= familles.length) return;

    const copie = [...familles];
    const deplace = copie[index];
    if (!deplace) return;
    copie.splice(index, 1);
    copie.splice(cibleIndex, 0, deplace);

    const reordered = copie.map((f, i) => ({ id: f.id, ordre: i + 1 }));
    setFamilles(copie);

    try {
      await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reordered }),
      });
      notifier("Ordre d'affichage mis à jour.");
    } catch (e) {
      console.error(e);
    }
  }

  function notifier(msg: string) {
    setMessageSucces(msg);
    setTimeout(() => setMessageSucces(null), 3000);
  }

  if (chargement && familles.length === 0) {
    return <div className="p-12 text-center text-brand-warm-grey animate-pulse">Chargement de la hiérarchie catalogue...</div>;
  }

  return (
    <div className="space-y-6 animate-entree">
      {messageSucces && (
        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-entree">
          <Check className="w-4 h-4" /> {messageSucces}
        </div>
      )}

      {erreur && (
        <div className="bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-entree">
          <AlertCircle className="w-4 h-4" /> {erreur}
        </div>
      )}

      {/* Interface Drill-down à 3 Panneaux Contextuels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* PANNEAU 1 : GRANDES FAMILLES */}
        <div className="carte !p-0 border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-brand-light-grey/40 dark:border-white/5 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300 flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-outfit text-brand-black dark:text-white">
                  1. Grandes Familles ({familles.length})
                </h3>
                <p className="text-[11px] text-brand-warm-grey">Niveau racine & tri</p>
              </div>
            </div>
            <button
              type="button"
              onClick={ouvrirAjoutFamille}
              className="btn btn-primaire text-xs py-1.5 px-2.5 rounded-lg shadow-xs flex items-center gap-1 font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Famille
            </button>
          </div>

          <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {familles.map((famille, idx) => {
              const active = famille.id === familleActiveId;
              const nbCats = famille.enfants?.length || 0;
              const totalProds = (famille.enfants || []).reduce(
                (acc, c) => acc + (c._count?.produits || 0) + (c.enfants || []).reduce((a, sc) => a + (sc._count?.produits || 0), 0),
                famille._count?.produits || 0
              );

              return (
                <div
                  key={famille.id}
                  onClick={() => {
                    setFamilleActiveId(famille.id);
                    setCategorieActiveId(famille.enfants?.[0]?.id || null);
                  }}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                    active
                      ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 shadow-xs"
                      : "bg-white dark:bg-brand-paper/60 border-brand-light-grey/40 dark:border-white/5 hover:border-brand-light-grey hover:bg-brand-light-grey/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-brand-warm-grey w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-brand-black dark:text-white truncate font-outfit">
                        {famille.nom}
                      </div>
                      <div className="text-[11px] text-brand-warm-grey">
                        {nbCats} cat. · {totalProds} art.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          void deplacerFamille(idx, "up");
                        }}
                        className="p-0.5 hover:text-brand-orange disabled:opacity-20"
                        title="Monter"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === familles.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          void deplacerFamille(idx, "down");
                        }}
                        className="p-0.5 hover:text-brand-orange disabled:opacity-20"
                        title="Descendre"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ouvrirEdition(famille, "famille");
                      }}
                      className="p-1 rounded-md text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void supprimer(famille);
                      }}
                      className="p-1 rounded-md text-brand-warm-grey hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${active ? "text-blue-600 dark:text-blue-400 translate-x-0.5" : "text-brand-warm-grey opacity-40"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANNEAU 2 : CATÉGORIES DE LA FAMILLE */}
        <div className="carte !p-0 border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-brand-light-grey/40 dark:border-white/5 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm font-outfit text-brand-black dark:text-white truncate">
                  2. Catégories ({categoriesFamille.length})
                </h3>
                <p className="text-[11px] text-brand-warm-grey truncate">
                  {familleActive ? familleActive.nom : "Sélectionnez une famille"}
                </p>
              </div>
            </div>
            {familleActiveId && (
              <button
                type="button"
                onClick={ouvrirAjoutCategorie}
                className="btn btn-secondaire text-xs py-1.5 px-2.5 rounded-lg shadow-xs flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Catégorie
              </button>
            )}
          </div>

          <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {!familleActive ? (
              <div className="p-8 text-center text-xs text-brand-warm-grey">
                Sélectionnez une famille à gauche pour gérer ses catégories.
              </div>
            ) : categoriesFamille.length === 0 ? (
              <div className="p-8 text-center text-xs text-brand-warm-grey">
                Aucune catégorie dans cette famille. Cliquez sur "+ Catégorie" pour en créer une.
              </div>
            ) : (
              categoriesFamille.map((cat) => {
                const active = cat.id === categorieActiveId;
                const nbSousCats = cat.enfants?.length || 0;
                const totalCatProds = (cat._count?.produits || 0) + (cat.enfants || []).reduce((a, sc) => a + (sc._count?.produits || 0), 0);

                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategorieActiveId(cat.id)}
                    className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                      active
                        ? "bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700 shadow-xs"
                        : "bg-white dark:bg-brand-paper/60 border-brand-light-grey/40 dark:border-white/5 hover:border-brand-light-grey hover:bg-brand-light-grey/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-brand-black dark:text-white truncate font-outfit">
                        {cat.nom}
                      </div>
                      <div className="text-[11px] text-brand-warm-grey">
                        {nbSousCats} sous-cat. · {totalCatProds} art.
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ouvrirEdition(cat, "categorie");
                        }}
                        className="p-1 rounded-md text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void supprimer(cat);
                        }}
                        className="p-1 rounded-md text-brand-warm-grey hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${active ? "text-cyan-600 dark:text-cyan-400 translate-x-0.5" : "text-brand-warm-grey opacity-40"}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANNEAU 3 : SOUS-CATÉGORIES & MODÈLES */}
        <div className="carte !p-0 border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-brand-light-grey/40 dark:border-white/5 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm font-outfit text-brand-black dark:text-white truncate">
                  3. Sous-catégories ({sousCategories.length})
                </h3>
                <p className="text-[11px] text-brand-warm-grey truncate">
                  {categorieActive ? categorieActive.nom : "Sélectionnez une catégorie"}
                </p>
              </div>
            </div>
            {categorieActiveId && (
              <button
                type="button"
                onClick={ouvrirAjoutSousCategorie}
                className="btn btn-secondaire text-xs py-1.5 px-2.5 rounded-lg shadow-xs flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Sous-cat.
              </button>
            )}
          </div>

          <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {!categorieActive ? (
              <div className="p-8 text-center text-xs text-brand-warm-grey">
                Sélectionnez une catégorie au centre pour voir ses sous-catégories.
              </div>
            ) : sousCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-brand-warm-grey">
                Aucune sous-catégorie rattachée. Cliquez sur "+ Sous-cat." pour ajouter un type spécifique.
              </div>
            ) : (
              sousCategories.map((sc) => {
                const totalModeles = sc._count?.modeles || 0;
                const totalProds = sc._count?.produits || 0;

                return (
                  <div
                    key={sc.id}
                    className="p-3 rounded-xl border border-brand-light-grey/40 dark:border-white/5 bg-white dark:bg-brand-paper/60 hover:bg-brand-light-grey/10 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-brand-black dark:text-white truncate font-outfit">
                        {sc.nom}
                      </div>
                      <div className="text-[11px] text-brand-warm-grey">
                        {totalModeles} modèle{totalModeles > 1 ? "s" : ""} · {totalProds} article{totalProds > 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => ouvrirEdition(sc, "sous_categorie")}
                        className="p-1 rounded-md text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void supprimer(sc)}
                        className="p-1 rounded-md text-brand-warm-grey hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODALE D'AJOUT / ÉDITION CONTEXTUELLE */}
      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-3 sm:p-4 animate-entree-rapide">
          <div className="bg-white dark:bg-brand-paper w-full max-w-[95vw] sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-brand-light-grey/60 dark:border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/5">
              <h3 className="font-bold text-base text-brand-black dark:text-white font-outfit">
                {entiteEditee 
                  ? `Modifier ${typeEntite === "famille" ? "la famille" : typeEntite === "categorie" ? "la catégorie" : "la sous-catégorie"}`
                  : `Nouvelle ${typeEntite === "famille" ? "Grande Famille" : typeEntite === "categorie" ? "Catégorie" : "Sous-catégorie"}`
                }
              </h3>
              <button
                type="button"
                onClick={() => setModalOuverte(false)}
                className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center text-brand-warm-grey hover:text-brand-black dark:hover:text-white rounded-lg hover:bg-brand-light-grey/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={sauvegarder} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="Ex: PC Portables, Disques NVMe..."
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Description technique ou usage..."
                    rows={3}
                    className="w-full px-3.5 py-2 text-sm bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
                  />
                </div>
              </div>

              <div className="flex-shrink-0 p-4 border-t border-brand-light-grey/30 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOuverte(false)}
                  className="btn btn-secondaire text-xs py-2 px-4 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoi || !formNom.trim()}
                  className="btn btn-primaire text-xs py-2 px-5 rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {envoi ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
