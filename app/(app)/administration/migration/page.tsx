"use client";

import { useState, useEffect } from "react";
import { IconeRecherche, IconeTelechargement } from "@/components/icons";

interface Proposition {
  id: string;
  groupe_categorie: string;
  groupe_reference: string;
  cible_categorie_id: number | null;
  cible_modele_nom: string | null;
  cible_attributs: any;
  statut: "en_attente" | "conflit" | "valide" | "rejete";
  confiance: number;
  raisons_json: string[];
  nb_produits: number;
}

export default function MigrationPage() {
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  
  useEffect(() => {
    fetchPropositions();
  }, []);

  const fetchPropositions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/migration/analyser");
      const data = await res.json();
      setPropositions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const lancerAnalyse = async () => {
    if (!confirm("Lancer l'analyse de tous les produits non migrés ?")) return;
    setAnalyzing(true);
    try {
      await fetch("/api/admin/migration/analyser", { method: "POST" });
      await fetchPropositions();
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const validerProposition = (id: string) => {
    setPropositions(props => 
      props.map(p => p.id === id ? { ...p, statut: "valide" } : p)
    );
  };

  const validerLot = () => {
    const ids = propositions.filter(p => p.statut === "en_attente" && p.confiance >= 90 && p.cible_categorie_id !== null).map(p => p.id);
    if (ids.length === 0) return;
    
    setPropositions(props => 
      props.map(p => ids.includes(p.id) ? { ...p, statut: "valide" } : p)
    );
  };

  const appliquerValides = async () => {
    const valides = propositions.filter(p => p.statut === "valide").map(p => p.id);
    if (valides.length === 0) {
      alert("Aucune proposition validée à appliquer.");
      return;
    }
    if (!confirm(`Appliquer ${valides.length} propositions en base de données ? Cette action modifiera les produits.`)) return;
    
    setApplying(true);
    try {
      const res = await fetch("/api/admin/migration/appliquer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propositionIds: valides })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`Migration réussie ! Batch ID: ${data.batch_id}\nProduits mis à jour: ${data.appliques}`);
      await fetchPropositions();
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
    setApplying(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SAS de Migration Intelligente</h1>
          <p className="text-gray-500">Analysez, vérifiez et appliquez la classification des anciens produits.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={lancerAnalyse}
            disabled={analyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? "Analyse en cours..." : "1. Lancer l'Analyse"}
          </button>
          <button 
            onClick={validerLot}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            2. Valider les évidences (≥ 90%)
          </button>
          <button 
            onClick={appliquerValides}
            disabled={applying}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {applying ? "Application..." : "3. Appliquer les Validés"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Chargement des propositions...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source (Legacy)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cible Proposée</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confiance & Raisons</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {propositions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Aucune proposition en attente. Lancez l'analyse.
                  </td>
                </tr>
              ) : propositions.map((prop) => (
                <tr key={prop.id} className={prop.statut === "valide" ? "bg-green-50" : prop.statut === "conflit" ? "bg-red-50" : ""}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{prop.groupe_reference}</div>
                    <div className="text-sm text-gray-500">Cat: {prop.groupe_categorie}</div>
                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {prop.nb_produits} produit(s)
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-blue-900">Modèle: {prop.cible_modele_nom || "???"}</div>
                    <div className="text-sm text-blue-600">Catégorie ID: {prop.cible_categorie_id || "À sélectionner"}</div>
                    {prop.cible_attributs && (
                      <div className="mt-1 text-xs text-gray-500">
                        {JSON.stringify(prop.cible_attributs)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-bold ${prop.confiance >= 90 ? 'text-green-600' : prop.confiance >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                        {prop.confiance}%
                      </div>
                      <span className="text-xs uppercase px-2 rounded-full border">
                        {prop.statut}
                      </span>
                    </div>
                    <ul className="mt-2 text-xs text-gray-500 list-disc pl-4">
                      {prop.raisons_json?.map((r, i) => <li key={i} className={r.includes('⚠') ? 'text-red-500' : ''}>{r}</li>)}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {prop.statut === "en_attente" && (
                      <button 
                        onClick={() => validerProposition(prop.id)}
                        className="text-green-600 hover:text-green-900"
                        disabled={!prop.cible_categorie_id}
                        title={!prop.cible_categorie_id ? "Catégorie cible manquante" : "Valider cette proposition"}
                      >
                        Valider
                      </button>
                    )}
                    {prop.statut === "valide" && (
                      <span className="text-green-600">Prêt à appliquer</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
