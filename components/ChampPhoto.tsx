"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { compresserPhoto } from "@/lib/photo-client";
import { capturerPhotoNative, captureNativeDisponible } from "@/lib/photo-capture";
import { IconeAppareilPhoto, IconeCorbeille } from "@/components/icons";

export default function ChampPhoto({
  apercu,
  onCapturer,
  onRetirer,
  disabled = false,
}: {
  apercu: string | null;
  onCapturer: (dataUrl: string) => void;
  onRetirer: () => void;
  disabled?: boolean;
}) {
  const { afficher } = useToast();
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);

  async function declencher() {
    if (captureNativeDisponible()) {
      setEnCours(true);
      try {
        const data = await capturerPhotoNative();
        if (data) onCapturer(data);
      } catch (e) {
        afficher(e instanceof Error ? e.message : "Échec de la capture photo.", "erreur");
      } finally {
        setEnCours(false);
      }
      return;
    }
    champ.current?.click();
  }

  async function surFichier(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichier = evenement.target.files?.[0];
    evenement.target.value = "";
    if (!fichier) return;
    setEnCours(true);
    try {
      onCapturer(await compresserPhoto(fichier));
    } catch (e) {
      afficher(e instanceof Error ? e.message : "Photo illisible.", "erreur");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <input
        ref={champ}
        type="file"
        accept="image/*"
        onChange={(e) => void surFichier(e)}
        className="hidden"
      />
      {apercu ? (
        <div className="flex items-center gap-3">
          <img
            src={apercu}
            alt="Aperçu de la photo du produit"
            className="h-16 w-16 shrink-0 rounded-lg border border-brand-light-grey object-cover"
          />
          <button
            type="button"
            disabled={disabled || enCours}
            onClick={() => void declencher()}
            className="btn btn-secondaire"
          >
            <IconeAppareilPhoto taille={14} />
            {enCours ? "Traitement…" : "Remplacer"}
          </button>
          <button
            type="button"
            disabled={disabled || enCours}
            onClick={onRetirer}
            aria-label="Retirer la photo"
            className="btn border border-danger/30 bg-brand-white text-danger hover:bg-danger/10"
          >
            <IconeCorbeille taille={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || enCours}
          onClick={() => void declencher()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
        >
          <IconeAppareilPhoto taille={18} />
          {enCours ? "Préparation de la photo…" : "Prendre une photo"}
        </button>
      )}
    </div>
  );
}
