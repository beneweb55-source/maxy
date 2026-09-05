"use client";

import { useState } from "react";
import { IconeNote, IconeCorbeille, IconeActualiser, IconeUpload } from "@/components/icons";
import { useToast } from "@/components/toast";

interface PieceJointe {
  id: number;
  nom: string;
  url: string;
  taille: number;
  type: string;
}

interface PiecesJointesProps {
  entreeId: number;
  piecesJointesInitiales: PieceJointe[];
  lectureSeule: boolean;
}

export function PiecesJointes({ entreeId, piecesJointesInitiales, lectureSeule }: PiecesJointesProps) {
  const { afficher } = useToast();
  const [pieces, setPieces] = useState<PieceJointe[]>(piecesJointesInitiales);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation basique (limite de 10Mo par exemple)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Le fichier est trop volumineux (max 10 Mo).");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const base64 = await toBase64(file);
      const res = await fetch(`/api/carnet/${entreeId}/fichiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: file.name,
          mime: file.type || "application/octet-stream",
          taille: file.size,
          base64: (base64 as string).split(",")[1], // on enlève le préfixe data:
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur lors de l'upload.");
      const nouvellePj = await res.json();
      setPieces((prev) => [...prev, nouvellePj]);
    } catch (err: any) {
      setUploadError(err.message || "Erreur d'importation.");
    } finally {
      setIsUploading(false);
      // Reset de l'input file
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette pièce jointe ?")) return;
    
    try {
      const res = await fetch(`/api/carnet/${entreeId}/fichiers?fileId=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setPieces((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      afficher("Erreur lors de la suppression.", "erreur");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  };

  return (
    <div className="bg-brand-white border border-brand-light-grey/50 rounded-xl p-4 sm:p-6 shadow-sm mt-6">
      <h3 className="font-outfit font-semibold text-brand-black mb-4 flex items-center gap-2">
        <IconeNote className="w-5 h-5 text-brand-grey" />
        Pièces jointes ({pieces.length})
      </h3>

      {pieces.length > 0 && (
        <ul className="space-y-2 mb-4">
          {pieces.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-brand-light-grey/30 bg-brand-paper group">
              <a 
                href={p.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 text-brand-black hover:text-brand-orange transition-colors"
              >
                <div className="p-2 bg-brand-light-grey/20 rounded">
                  <IconeNote className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium line-clamp-1">{p.nom}</span>
                  <span className="text-xs text-brand-grey">{formatSize(p.taille)}</span>
                </div>
              </a>
              {!lectureSeule && (
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="p-2 text-brand-grey hover:text-brand-orange hover:bg-brand-orange/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Supprimer"
                >
                  <IconeCorbeille className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pieces.length === 0 && !isUploading && (
        <p className="text-sm text-brand-warm-grey italic mb-4">Aucune pièce jointe.</p>
      )}

      {!lectureSeule && (
        <div>
          {uploadError && <p className="text-sm text-brand-orange mb-2">{uploadError}</p>}
          <label className={`
            flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-brand-light-grey/50 rounded-xl
            text-brand-grey font-medium text-sm transition-colors cursor-pointer
            ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-orange hover:text-brand-orange'}
          `}>
            {isUploading ? (
              <>
                <IconeActualiser className="w-5 h-5 animate-spin" /> Importation...
              </>
            ) : (
              <>
                <IconeUpload className="w-5 h-5" /> Ajouter un fichier
              </>
            )}
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function toBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
