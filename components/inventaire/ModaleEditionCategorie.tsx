import { useState, useRef } from "react";
import Modale from "@/components/Modale";
import { IconeEnregistrer, IconeImage, IconeCrayon } from "@/components/icons";
import type { CategorieInfo } from "./VueCategorie";

export default function ModaleEditionCategorie({
  nomCategorie,
  categorieInfo,
  fermer,
  onSucces
}: {
  nomCategorie: string;
  categorieInfo: CategorieInfo | null;
  fermer: () => void;
  onSucces: (nouvelleInfo: CategorieInfo) => void;
}) {
  const [description, setDescription] = useState(categorieInfo?.description || "");
  const [imageUrl, setImageUrl] = useState(categorieInfo?.image_url || "");
  const [fichier, setFichier] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(categorieInfo?.image_url || null);
  
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const gererChoixFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErreur("Veuillez sélectionner une image valide (JPG, PNG...).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErreur("L'image est trop volumineuse (max 5 Mo).");
      return;
    }

    setErreur(null);
    setFichier(file);
    
    // Générer une preview locale
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      let payloadImageUrl = imageUrl;

      // Si un fichier local a été sélectionné, on passe la data URL au backend
      // Le backend se chargera de l'uploader vers Vercel Blob et d'enregistrer l'URL distante
      if (fichier && previewUrl && previewUrl.startsWith('data:')) {
        payloadImageUrl = previewUrl;
      }

      const res = await fetch(`/api/categories/info/${encodeURIComponent(nomCategorie)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image_url: payloadImageUrl.trim() || null, 
          description: description.trim() || null 
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur de sauvegarde");
      }

      const updated = await res.json();
      onSucces(updated);
    } catch (e: any) {
      console.error(e);
      setErreur(e.message || "Erreur réseau");
      setLoading(false);
    }
  };

  return (
    <Modale ouverte={true} onFermer={fermer} titre={`Modifier la Famille: ${nomCategorie}`}>
      <form onSubmit={sauvegarder} className="space-y-6">
        {erreur && <div className="text-sm text-red-600 p-3 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50">{erreur}</div>}
        
        {/* Upload d'image avec Preview */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-brand-black dark:text-white">Image de la Famille</label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div 
              className="w-24 h-24 rounded-xl border-2 border-dashed border-brand-light-grey dark:border-white/20 flex flex-col items-center justify-center bg-brand-light-grey/10 dark:bg-brand-paper cursor-pointer overflow-hidden group relative hover:border-brand-smooth transition-colors shrink-0"
              onClick={() => inputRef.current?.click()}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <IconeCrayon taille={20} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="text-brand-warm-grey flex flex-col items-center gap-1 group-hover:text-brand-orange transition-colors">
                  <IconeImage taille={24} />
                  <span className="text-xs font-medium">Upload</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2 w-full">
              <input 
                type="file" 
                ref={inputRef} 
                onChange={gererChoixFichier} 
                accept="image/*"
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn bg-white hover:bg-brand-light-grey/20 dark:bg-brand-paper dark:hover:bg-white/5 border border-brand-light-grey dark:border-white/10 text-sm py-1.5 px-3 shadow-none w-full sm:w-auto"
              >
                Parcourir mon appareil...
              </button>
              <div className="text-xs text-brand-warm-grey">
                Formats acceptés : JPG, PNG, WEBP (Max 5 Mo).
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-white">Description</label>
          <textarea
            className="champ w-full min-h-[100px] resize-y"
            placeholder="Informations générales sur cette famille de produits..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-brand-light-grey/50 dark:border-white/10">
          <button type="button" onClick={fermer} className="btn btn-secondaire mr-2" disabled={loading}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire" disabled={loading}>
            <IconeEnregistrer taille={16} />
            {loading ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modale>
  );
}
