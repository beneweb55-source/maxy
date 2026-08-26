import { useState, useRef } from "react";
import Modale from "@/components/Modale";
import { useT } from "@/lib/i18n/contexte";
import { encodeBase64Url } from "@/lib/base64url";
import { IconeEnregistrer } from "@/components/icons";

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
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  
  const [reference, categorie] = cleFamille.split("|");

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      // Encoding the key properly
      const id = encodeBase64Url(cleFamille);
      const res = await fetch(`/api/familles/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nom: nom.trim() || null, 
          image_url: imageUrl.trim() || null, 
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
    <Modale ouverte={true} onFermer={fermer} titre={`Modifier la famille: ${reference}`}>
      <form onSubmit={sauvegarder} className="space-y-4">
        {erreur && <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">{erreur}</div>}
        
        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-brand-light-grey">Nom personnalisé</label>
          <input
            type="text"
            className="champ w-full"
            placeholder="Laisser vide pour utiliser la référence"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-brand-light-grey">URL de l'image représentative</label>
          <input
            type="url"
            className="champ w-full"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <div className="text-xs text-brand-warm-grey mt-1">L'image sera prioritaire par rapport aux photos des exemplaires.</div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-brand-black dark:text-brand-light-grey">Description</label>
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
