"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "developpement", "inventaire", "caisse", "tests", 
  "maintenance", "ui_ux", "reseau", "materiel", 
  "administration", "recherche", "correction", "autre"
];

export default function NouveauCarnetPage() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("developpement");
  const [dateTravail, setDateTravail] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return setErreur("Le titre est obligatoire.");
    
    setIsLoading(true);
    setErreur("");

    try {
      const res = await fetch("/api/carnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: titre.trim(),
          categorie,
          date_travail: dateTravail
        })
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la création.");
      }

      const entree = await res.json();
      router.push(`/carnet/${entree.id}`);
    } catch (e: any) {
      setErreur(e.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-outfit text-brand-black tracking-tight">Nouvelle entrée</h1>
        <p className="text-sm text-brand-warm-grey">
          Créez un nouveau rapport de travail dans votre carnet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-brand-white border border-brand-light-grey/50 rounded-xl p-6 shadow-sm space-y-4">
        {erreur && <div className="p-3 bg-brand-orange/10 text-brand-orange rounded-lg text-sm">{erreur}</div>}

        <div>
          <label className="libelle">Titre du rapport</label>
          <input 
            type="text" 
            className="champ w-full"
            placeholder="Ex: Refonte du module de caisse..."
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            disabled={isLoading}
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="libelle">Catégorie principale</label>
            <select 
              className="champ w-full capitalize"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              disabled={isLoading}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="libelle">Date d'intervention</label>
            <input 
              type="date" 
              className="champ w-full"
              value={dateTravail}
              onChange={(e) => setDateTravail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-light-grey/30 mt-6">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-brand-grey hover:text-brand-black transition-colors"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            className="bg-brand-black text-brand-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-brand-dark-grey transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Création..." : "Commencer la rédaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
