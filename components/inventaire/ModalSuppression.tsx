"use client";

import Modale from "@/components/Modale";
import { IconeCorbeille } from "@/components/icons";
import { useT } from "@/lib/i18n/contexte";
import { AlertCircle } from "lucide-react";

interface LigneProduitSimple {
  code_interne: string;
  reference: string;
}

interface ModalSuppressionProps {
  modalSuppression: {
    type: "unites" | "modele";
    reference: string;
    categorie: string;
    unites: LigneProduitSimple[];
    vendusExclus: number;
  } | null;
  onFermer: () => void;
  onSubmit: () => void;
  envoi: boolean;
}

export default function ModalSuppression({
  modalSuppression,
  onFermer,
  onSubmit,
  envoi,
}: ModalSuppressionProps) {
  const t = useT();

  return (
    <Modale
      titre={
        modalSuppression
          ? modalSuppression.unites.length === 0
            ? t("inventaire.suppressionImpossible")
            : modalSuppression.type === "modele"
              ? t("inventaire.supprimerModeleTitre", { ref: modalSuppression.reference })
              : modalSuppression.unites.length === 1
                ? t("inventaire.supprimerUniteTitre", { code: modalSuppression.unites[0]!.code_interne })
                : t("inventaire.supprimerMasseTitre", { n: modalSuppression.unites.length })
          : ""
      }
      ouverte={modalSuppression !== null}
      onFermer={onFermer}
    >
      {modalSuppression && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!envoi && modalSuppression.unites.length > 0) {
              onSubmit();
            }
          }}
        >
          {modalSuppression.unites.length === 0 ? (
            <p className="text-sm text-brand-warm-grey">
              {modalSuppression.vendusExclus === 1
                ? t("inventaire.suppressionImpossibleVendu")
                : modalSuppression.vendusExclus > 1
                  ? t("inventaire.suppressionImpossibleVendus", { n: modalSuppression.vendusExclus })
                  : t("inventaire.aucuneSuppression")}
            </p>
          ) : modalSuppression.type === "modele" ? (
            <p className="text-sm text-brand-warm-grey">
              {t("inventaire.suppressionModeleAvertissement", { ref: modalSuppression.reference, cat: modalSuppression.categorie })}
            </p>
          ) : modalSuppression.unites.length === 1 ? (
            <p className="text-sm text-brand-warm-grey">
              {t("inventaire.suppressionUniteAvertissement", { ref: modalSuppression.unites[0]!.reference })}
            </p>
          ) : (
            <p className="text-sm text-brand-warm-grey">
              {t("inventaire.suppressionMasseAvertissement", { n: modalSuppression.unites!.length })}
              <strong className="text-brand-black">{modalSuppression.reference}</strong> (
              {modalSuppression.unites[0]?.code_interne} {t("inventaire.a")} {" "}
              {modalSuppression.unites[modalSuppression.unites.length - 1]?.code_interne}) {t("inventaire.suppressionIreversible")}
            </p>
          )}

          {modalSuppression.unites.length > 0 &&
            modalSuppression.vendusExclus > 0 &&
            (modalSuppression.type === "modele" ? (
              <p className="mt-2 rounded-2xl bg-brand-glow/20 dark:bg-white/5 border border-brand-orange/20 p-3 text-xs text-brand-warm-grey flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                Les exemplaires déjà vendus de ce modèle sont conservés (historique de vente
                préservé).
              </p>
            ) : (
              <p className="mt-2 rounded-2xl bg-brand-glow/20 dark:bg-white/5 border border-brand-orange/20 p-3 text-xs text-brand-warm-grey flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                {modalSuppression.vendusExclus} exemplaire
                {modalSuppression.vendusExclus > 1 ? "s" : ""} vendu
                {modalSuppression.vendusExclus > 1 ? "s" : ""} conservé
                {modalSuppression.vendusExclus > 1 ? "s" : ""} (historique de vente préservé).
              </p>
            ))}

          <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <button
              type="button"
              onClick={onFermer}
              className="btn btn-secondaire w-full sm:w-auto justify-center"
            >
              {modalSuppression.unites.length === 0 ? "Fermer" : "Annuler"}
            </button>
            {modalSuppression.unites.length > 0 && (
              <button
                type="submit"
                disabled={envoi}
                className="btn btn-danger min-h-[48px] rounded-xl font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <IconeCorbeille taille={15} />
                Supprimer définitivement
              </button>
            )}
          </div>
        </form>
      )}
    </Modale>
  );
}
