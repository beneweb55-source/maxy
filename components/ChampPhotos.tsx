"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/contexte";
import { compresserPhoto } from "@/lib/photo-client";
import {
  capturerPhotoNative,
  captureNativeDisponible,
  priseDePhotoDisponible,
} from "@/lib/photo-capture";
import { MAX_PHOTOS_PRODUIT } from "@/lib/validation";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import {
  IconeAppareilPhoto,
  IconeCorbeille,
  IconeEtoile,
  IconeImage,
  IconeTelechargement,
} from "@/components/icons";

/**
 * Lien de téléchargement d'une photo du champ. Deux cas :
 * — data-URL (photo ajoutée, pas encore enregistrée) : le href est la donnée
 *   elle-même et l'attribut `download` fournit le nom de fichier ;
 * — URL servie par l'app (photo existante) : `?download=1` délègue au serveur
 *   le nom propre (P-XXXX-NN.jpg) via Content-Disposition.
 */
function lienTelechargementPhoto(src: string, index: number): { href: string; nom: string } {
  const numero = String(index + 1).padStart(2, "0");
  const mime = /^data:image\/(\w+);/.exec(src)?.[1];
  if (mime) {
    const ext = mime === "png" ? "png" : mime === "webp" ? "webp" : "jpg";
    return { href: src, nom: `photo-${numero}.${ext}` };
  }
  const separateur = src.includes("?") ? "&" : "?";
  return { href: `${src}${separateur}download=1`, nom: `photo-${numero}.jpg` };
}

/**
 * Champ de saisie multi-photos. La première photo du tableau est la couverture.
 * `photos` peut mélanger des data-URL (nouvelles) et des URL servies (existantes) :
 * les deux s'affichent, et sont renvoyées telles quelles dans `onChange`.
 */
export default function ChampPhotos({
  photos,
  onChange,
  disabled = false,
  max = MAX_PHOTOS_PRODUIT,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const { afficher } = useToast();
  const t = useT();
  const champCamera = useRef<HTMLInputElement>(null);
  const champGalerie = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [photoDisponible, setPhotoDisponible] = useState(false);
  // Index de la photo affichée en plein écran (null = aperçu fermé).
  const [apercu, setApercu] = useState<number | null>(null);
  useEffect(() => setPhotoDisponible(priseDePhotoDisponible()), []);

  const plein = photos.length >= max;

  function ajouter(nouvelles: string[]) {
    if (nouvelles.length === 0) return;
    const place = Math.max(0, max - photos.length);
    if (place === 0) {
      afficher(t("champPhotos.max", { max }), "erreur");
      return;
    }
    if (nouvelles.length > place) {
      afficher(t("champPhotos.max", { max }), "erreur");
    }
    onChange([...photos, ...nouvelles.slice(0, place)]);
  }

  async function declencherCamera() {
    if (plein) {
      afficher(t("champPhotos.max", { max }), "erreur");
      return;
    }
    if (captureNativeDisponible()) {
      setEnCours(true);
      try {
        const res = await capturerPhotoNative("camera");
        if (res.statut === "ok") {
          ajouter([res.dataUrl]);
          return;
        }
        if (res.statut === "annule") return;
        // indisponible → repli sur l'input HTML ci-dessous.
      } catch (e) {
        afficher(e instanceof Error ? e.message : t("champPhotos.echecCapture"), "erreur");
        return;
      } finally {
        setEnCours(false);
      }
    }
    champCamera.current?.click();
  }

  async function surFichiers(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(evenement.target.files ?? []);
    evenement.target.value = "";
    if (fichiers.length === 0) return;
    setEnCours(true);
    try {
      const compressees: string[] = [];
      for (const fichier of fichiers) {
        try {
          compressees.push(await compresserPhoto(fichier));
        } catch (e) {
          afficher(e instanceof Error ? e.message : t("champPhotos.illisible"), "erreur");
        }
      }
      ajouter(compressees);
    } finally {
      setEnCours(false);
    }
  }

  function retirer(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  // --- LOGIQUE DRAG & DROP TACTILE ---
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = (index: number, e: React.PointerEvent) => {
    // Désactiver le scroll du navigateur sur l'élément pendant le drag
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggedIndex(index);
    setHoveredIndex(index);
    startPos.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    
    // Feedback haptique si disponible
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(50); } catch (e) { /* ignore */ }
    }
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (disabled || enCours) return;
    // Si clic gauche souris ou touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    
    // Déclenche le drag après un appui long (200ms) pour ne pas bloquer le scroll naturel
    e.persist();
    timerRef.current = setTimeout(() => {
      startDrag(index, e);
    }, 200);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Si on n'est pas encore en train de drag, on annule le long-press si l'utilisateur bouge (il veut scroller)
    if (draggedIndex === null) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // On est en train de drag
    e.preventDefault();
    const currentX = e.clientX;
    const currentY = e.clientY;
    setDragOffset({
      x: currentX - startPos.current.x,
      y: currentY - startPos.current.y
    });

    // Déterminer sur quel élément on survole
    if (containerRef.current) {
      const elements = Array.from(containerRef.current.children);
      for (let i = 0; i < elements.length; i++) {
        if (i === draggedIndex) continue;
        const element = elements[i];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (
          currentX >= rect.left && currentX <= rect.right &&
          currentY >= rect.top && currentY <= rect.bottom
        ) {
          if (hoveredIndex !== i) setHoveredIndex(i);
          break;
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (draggedIndex !== null) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      
      if (hoveredIndex !== null && hoveredIndex !== draggedIndex) {
        // Appliquer le changement d'ordre
        const newPhotos = [...photos];
        const [moved] = newPhotos.splice(draggedIndex, 1);
        newPhotos.splice(hoveredIndex, 0, moved);
        
        // Si l'index 0 a changé, on pourrait notifier "Nouvelle couverture"
        if (hoveredIndex === 0 || draggedIndex === 0) {
          afficher(t("champPhotos.nouvelleCouverture", "Nouvelle couverture définie"), "succes");
        }
        
        onChange(newPhotos);
      }
      
      setDraggedIndex(null);
      setHoveredIndex(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // ------------------------------------

  return (
    <div className="space-y-3 select-none">
      <input
        ref={champCamera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void surFichiers(e)}
        className="hidden"
      />
      <input
        ref={champGalerie}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void surFichiers(e)}
        className="hidden"
      />

      {photos.length > 0 && (
        <div 
          ref={containerRef}
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 touch-pan-y relative"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {photos.map((src, index) => {
            const isDragged = index === draggedIndex;
            const isHovered = index === hoveredIndex && draggedIndex !== null && index !== draggedIndex;
            
            return (
              <div
                key={`${src.slice(0, 32)}-${index}`}
                onPointerDown={(e) => handlePointerDown(index, e)}
                style={{
                  transform: isDragged 
                    ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.05)` 
                    : isHovered 
                      ? 'scale(0.95)' 
                      : 'none',
                  zIndex: isDragged ? 50 : 1,
                  transition: isDragged ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: isDragged ? 0.9 : 1,
                  boxShadow: isDragged ? '0 20px 25px -5px rgba(0, 0, 0, 0.3)' : 'none'
                }}
                className={`relative aspect-square overflow-hidden rounded-lg border bg-brand-paper ${isDragged ? 'border-brand-orange cursor-grabbing' : 'border-brand-light-grey cursor-grab'}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    // Ne pas ouvrir la visionneuse si c'était un drag
                    if (draggedIndex === null && !timerRef.current) setApercu(index);
                  }}
                  title={t("champPhotos.agrandir")}
                  aria-label={t("champPhotos.agrandir")}
                  className="block h-full w-full pointer-events-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={index === 0 ? t("champPhotos.couverture") : ""}
                    loading="lazy"
                    className="h-full w-full object-cover pointer-events-none"
                  />
                </button>
                
                {/* Badge Couverture (index 0 ou futur index 0 si hovered) */}
                {(index === 0 && !isHovered && draggedIndex !== 0) || (isHovered && hoveredIndex === 0) || (isDragged && hoveredIndex === 0) ? (
                  <span className="pointer-events-none absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                    <IconeEtoile taille={10} />
                    {t("champPhotos.couverture")}
                  </span>
                ) : null}

                {/* Actions Bottom */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/55 to-transparent p-1">
                  <a
                    href={lienTelechargementPhoto(src, index).href}
                    download={lienTelechargementPhoto(src, index).nom}
                    title={t("visionneuse.telecharger")}
                    aria-label={t("visionneuse.telecharger")}
                    className="pointer-events-auto rounded-md bg-brand-white/90 p-1 text-brand-black transition hover:bg-brand-white active-scale"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag on button
                  >
                    <IconeTelechargement taille={13} />
                  </a>
                  {/* Bouton définir couverture retiré car on utilise le drag&drop, mais gardé en backup accessible via clavier ? On le garde pour l'instant */}
                  {index !== 0 && (
                    <button
                      type="button"
                      disabled={disabled || enCours}
                      onClick={(e) => { e.stopPropagation(); definirCouverture(index); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title={t("champPhotos.definirCouverture")}
                      aria-label={t("champPhotos.definirCouverture")}
                      className="pointer-events-auto rounded-md bg-brand-white/90 p-1 text-brand-black transition hover:bg-brand-white active-scale sm:hidden"
                    >
                      <IconeEtoile taille={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled || enCours}
                    onClick={(e) => { e.stopPropagation(); retirer(index); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title={t("champPhotos.retirer")}
                    aria-label={t("champPhotos.retirer")}
                    className="pointer-events-auto rounded-md bg-brand-white/90 p-1 text-danger transition hover:bg-brand-white active-scale"
                  >
                    <IconeCorbeille taille={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {photoDisponible && (
          <button
            type="button"
            disabled={disabled || enCours || plein}
            onClick={() => void declencherCamera()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
          >
            <IconeAppareilPhoto taille={18} />
            {enCours ? t("champPhotos.preparation") : t("champPhotos.prendrePhoto")}
          </button>
        )}
        <button
          type="button"
          disabled={disabled || enCours || plein}
          onClick={() => champGalerie.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
        >
          <IconeImage taille={18} />
          {enCours ? t("champPhotos.traitement") : t("champPhotos.ajouterPhotos")}
        </button>
      </div>

      <p className="text-xs text-brand-warm-grey">
        {photos.length === 0
          ? t("champPhotos.vide")
          : t("champPhotos.compteur", { n: photos.length, max })}
      </p>

      {apercu !== null && photos.length > 0 && (
        <VisionneusePhotos
          photos={photos}
          index={apercu}
          onFermer={() => setApercu(null)}
          onNaviguer={setApercu}
          lienTelechargement={(i) => lienTelechargementPhoto(photos[i] ?? "", i).href}
          nomTelechargement={(i) => lienTelechargementPhoto(photos[i] ?? "", i).nom}
        />
      )}
    </div>
  );
}
