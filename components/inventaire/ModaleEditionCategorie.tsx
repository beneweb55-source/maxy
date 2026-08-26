import { useState } from "react";
import Modale from "@/components/Modale";
import { useT } from "@/lib/i18n/contexte";
import { IconeEnregistrer } from "@/components/icons";

export interface CategorieInfo {
  nom: string;
  image_url: string | null;
}

export default function ModaleEditionCategorie({
  categorieNom,
  imageActuelle,
  fermer,
  onSucces
}: {
  categorieNom: string;
  imageActuelle: string | null;
  fermer: () => void;
  onSucces: (nouvelleInfo: CategorieInfo) => void;
}) {
  const [imageUrl, setImageUrl] = useState(imageActuelle || "");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(categorieNom)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image_url: imageUrl.trim() || null 
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
    <Modale ouverte={true} onFermer={fermer} titre={`Modifier la catégorie: ${categorieNom}`}>
      <form onSubmit={sauvegarder} className="space-y-4">
        {erreur && <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">{erreur}</div>}

        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-brand-warm-grey">URL de l'image de couverture</label>
          <input
            type="url"
            className="champ w-full"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <div className="text-xs text-brand-warm-grey mt-1">L'image sera utilisée pour illustrer cette catégorie dans le cockpit.</div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={fermer} className="btn btn-secondaire" disabled={loading}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primaire bg-brand-orange text-white" disabled={loading}>
            {loading ? "Enregistrement..." : (
              <>
                <IconeEnregistrer taille={16} /> Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </Modale>
  );
}
