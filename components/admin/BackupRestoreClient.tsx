"use client";

import { useState, useRef } from "react";
import { IconeUpload, IconeAlerte } from "@/components/icons";
import { useToast } from "@/components/toast";
import Modale from "@/components/Modale";

export default function BackupRestoreClient() {
  const { afficher } = useToast();
  const [fichier, setFichier] = useState<File | null>(null);
  const [modalOuverte, setModalOuverte] = useState(false);
  const [confirmationTexte, setConfirmationTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFichierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFichier(e.target.files[0]!);
    }
  };

  const declencherUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRestaurer = async () => {
    if (confirmationTexte !== "RESTAURER") {
      afficher("Vous devez écrire RESTAURER pour confirmer.", "erreur");
      return;
    }
    if (!fichier) return;

    setEnCours(true);
    try {
      const contenu = await fichier.text();
      let jsonParse;
      try {
        jsonParse = JSON.parse(contenu);
      } catch (err) {
        throw new Error("Le fichier fourni n'est pas un JSON valide.");
      }

      if (!jsonParse.version || !jsonParse.data) {
        throw new Error("Format de sauvegarde non reconnu.");
      }

      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonParse),
      });

      const bodyRes = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(bodyRes?.error || "Erreur serveur lors de la restauration.");
      }

      afficher("Restauration réussie ! La base de données a été réinitialisée.", "succes");
      setModalOuverte(false);
      setFichier(null);
      setConfirmationTexte("");
      
      // Forcer le rechargement de la page après un court délai pour que l'UI récupère le nouvel état
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (e: any) {
      afficher(e.message || "Erreur inconnue lors de la restauration.", "erreur");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <>
      <div className="carte p-6 flex flex-col gap-4 items-start border-danger/30 bg-danger/5">
        <div className="flex items-center gap-3 w-full">
          <div className="h-10 w-10 bg-danger/20 text-danger flex items-center justify-center rounded-full">
            <IconeAlerte taille={20} />
          </div>
          <div>
            <h3 className="font-bold text-brand-black dark:text-white">Restauration d'urgence</h3>
            <p className="text-xs text-brand-warm-grey">Écrase les données actuelles depuis un fichier .json</p>
          </div>
        </div>

        <div className="w-full bg-white/80 dark:bg-black/30 rounded p-3 text-sm border border-danger/20">
          <p className="text-xs text-danger font-semibold mb-2">Attention : Cette action est irréversible.</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-brand-black dark:text-brand-warm-grey">
            <li>Toutes les données actuelles seront supprimées.</li>
            <li>La plateforme sera restaurée dans l'état exact du fichier fourni.</li>
            <li>Vous serez potentiellement déconnecté si votre utilisateur est différent dans la sauvegarde.</li>
          </ul>
        </div>

        <input 
          type="file" 
          accept=".json" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFichierChange}
        />

        <div className="flex gap-3 w-full mt-2 flex-col sm:flex-row">
          <button 
            type="button" 
            className="btn btn-secondaire flex-1 justify-center"
            onClick={declencherUpload}
          >
            <IconeUpload taille={16} />
            {fichier ? fichier.name : "Sélectionner un fichier JSON"}
          </button>

          <button 
            type="button" 
            className="btn justify-center flex-1 bg-danger hover:bg-danger/90 text-white font-bold"
            disabled={!fichier}
            onClick={() => setModalOuverte(true)}
          >
            <IconeAlerte taille={16} className="mr-1" />
            Restaurer la plateforme
          </button>
        </div>
      </div>

      <Modale
        ouverte={modalOuverte}
        onFermer={() => !enCours && setModalOuverte(false)}
        titre="DANGER : Confirmer la Restauration"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-brand-black dark:text-white">
            Vous êtes sur le point d'effacer <strong className="text-danger">TOUTES LES DONNÉES</strong> actuelles pour y substituer le contenu du fichier <strong className="font-mono">{fichier?.name}</strong>.
          </p>
          
          <div className="bg-brand-light-grey/20 dark:bg-brand-black/50 p-3 rounded text-sm text-brand-grey dark:text-brand-warm-grey space-y-2">
            <p>Veuillez taper le mot <strong>RESTAURER</strong> en majuscules pour confirmer votre intention :</p>
            <input 
              type="text" 
              className="champ w-full border-danger focus:ring-danger text-brand-black dark:text-white dark:bg-brand-dark font-bold text-center" 
              placeholder="RESTAURER"
              value={confirmationTexte}
              onChange={(e) => setConfirmationTexte(e.target.value)}
              disabled={enCours}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOuverte(false)}
              className="btn btn-secondaire"
              disabled={enCours}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleRestaurer}
              disabled={confirmationTexte !== "RESTAURER" || enCours}
              className="btn justify-center bg-danger hover:bg-danger/90 text-white disabled:opacity-50"
            >
              {enCours ? "Restauration en cours..." : "Confirmer et Restaurer"}
            </button>
          </div>
        </div>
      </Modale>
    </>
  );
}
