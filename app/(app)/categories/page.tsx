import { Metadata } from "next";
import GestionCategories from "@/components/categories/GestionCategories";

export const metadata: Metadata = {
  title: "Gestion des Catégories | Maxy",
  description: "Administration de l'arbre des catégories et sous-catégories",
};

export default function CategoriesPage() {
  return (
    <div className="flex-1 w-full bg-brand-light-grey/10 dark:bg-black/20 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-2">
            Gestion du Catalogue
          </h1>
          <p className="text-brand-warm-grey dark:text-white/60 font-medium max-w-2xl">
            Créez et organisez vos familles, catégories et sous-catégories. 
            Vous pouvez gérer l'arborescence complète de votre inventaire ici.
          </p>
        </div>

        <GestionCategories />
      </div>
    </div>
  );
}
