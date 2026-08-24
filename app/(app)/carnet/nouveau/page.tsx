"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconeChevronBas, IconeCoche } from "@/components/icons";

const CATEGORIES = [
  "developpement", "inventaire", "caisse", "tests", 
  "maintenance", "ui_ux", "reseau", "materiel", 
  "administration", "recherche", "correction", "autre"
];

export default function NouveauCarnetPage() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          categories,
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
            <label className="libelle">Catégories</label>
            <div className="relative mt-1" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoading}
                className="champ w-full flex items-center justify-between capitalize text-left min-h-[42px]"
              >
                <span className={categories.length === 0 ? "text-brand-grey" : "text-brand-black"}>
                  {categories.length === 0 
                    ? "Sélectionner des catégories..." 
                    : categories.map(c => c.replace(/_/g, " ")).join(", ")}
                </span>
                <IconeChevronBas className={`w-4 h-4 text-brand-grey transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 top-full left-0 mt-1 w-full bg-brand-white border border-brand-light-grey/50 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {CATEGORIES.map(c => {
                    const isSelected = categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCategories(categories.filter(cat => cat !== c));
                          } else {
                            setCategories([...categories, c]);
                          }
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm capitalize transition-colors flex items-center justify-between hover:bg-brand-light-grey/20 ${isSelected ? "bg-brand-orange/5 text-brand-orange font-medium" : "text-brand-black"}`}
                      >
                        {c.replace(/_/g, " ")}
                        {isSelected && <IconeCoche className="w-4 h-4 text-brand-orange" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
