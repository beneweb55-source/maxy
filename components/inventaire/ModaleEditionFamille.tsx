import { useState, useRef } from "react";
import Modale from "@/components/Modale";
import { useT } from "@/lib/i18n/contexte";
import { encodeBase64Url } from "@/lib/base64url";
import { IconeEnregistrer, IconeImage, IconeCrayon } from "@/components/icons";

export interface FamilleInfo {
  id: string;
  nom: string | null;
  image_url: string | null;
  description: string | null;
}

export default function ModaleEditionFamille({
  familleInfo,
  cleFamille,
  fermer,
  onSucces
}: {
  familleInfo: FamilleInfo | null;
  cleFamille: string; // reference|categorie
  fermer: () => void;
  onSucces: (nouvelleInfo: FamilleInfo) => void;
}) {
  const [nom, setNom] = useState(familleInfo?.nom || "");
  const [description, setDescription] = useState(familleInfo?.description || "");
  const [imageUrl, setImageUrl] = useState(familleInfo?.image_url || "");
  const [prixVente, setPrixVente] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(familleInfo?.image_url || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const gererChoixFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErreur("Veuillez sélectionner une image valide.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErreur("L'image est trop volumineuse (max 5 Mo).");
      return;
    }
    setErreur(null);
    setFichier(file);
    
    const reader = new FileReader();
    reader.onload = (event) => setPreviewUrl(event.target?.result as string);
    reader.readAsDataURL(file);
  };
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  
  const [reference, categorie] = cleFamille.split("|");

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      let payloadImageUrl = imageUrl;
      if (fichier && previewUrl && previewUrl.startsWith('data:')) {
        payloadImageUrl = previewUrl;
      }

      const id = encodeBase64Url(cleFamille);
      const res = await fetch(`/api/familles/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nom: nom.trim() || null, 
          image_url: payloadImageUrl.trim() || null, 
          description: description.trim() || null,
          prix_vente: prixVente ? parseInt(prixVente) : undefined,
          prix_achat: prixAchat ? parseInt(prixAchat) : undefined
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
    <Modale ouverte={true} onFermer={fermer} titre={`Modifier la catégorie: ${reference}`}>
      <form onSubmit={sauvegarder} className="space-y-6">
        {erreur && <div className="text-sm text-red-600 p-3 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50">{erreur}</div>}
        
        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-white">Nom d'affichage personnalisé</label>
          <input
            type="text"
            value={nom}
            onChange={e => setNom(e.target.value)}
            className="w-full px-4 py-2 bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-brand-black dark:text-white"
            placeholder={`Par défaut: ${reference}`}
          />
          <p className="text-xs text-brand-warm-grey mt-1">Laissez vide pour utiliser la référence d'origine.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-white">Appliquer un prix de vente (DA)</label>
            <input
              type="number"
              min="0"
              value={prixVente}
              onChange={e => setPrixVente(e.target.value)}
              className="w-full px-4 py-2 bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-brand-black dark:text-white"
              placeholder="Ex: 5000"
            />
            <p className="text-xs text-brand-warm-grey mt-1">S'applique à TOUS les produits de cette fiche.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-white">Appliquer un prix d'achat (DA)</label>
            <input
              type="number"
              min="0"
              value={prixAchat}
              onChange={e => setPrixAchat(e.target.value)}
              className="w-full px-4 py-2 bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange text-brand-black dark:text-white"
              placeholder="Ex: 3000"
            />
            <p className="text-xs text-brand-warm-grey mt-1">Modifie le coût d'achat de TOUS ces produits.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-brand-black dark:text-white">Image de la Catégorie</label>
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
                Formats acceptés : JPG, PNG, WEBP (Max 5 Mo). L'image remplace les photos des exemplaires pour la miniature.
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-brand-warm-grey">Nom personnalisé de la catégorie</label>
          <input
            type="text"
            className="champ w-full"
            placeholder="Laisser vide pour utiliser la référence"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-brand-warm-grey">Description</label>
          <textarea
            className="champ w-full"
            rows={3}
            placeholder="Informations spécifiques à ce modèle..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-brand-light-grey/50">
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
