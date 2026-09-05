"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconeCorbeille } from "@/components/icons";
import { useConfirmation } from "@/hooks/useConfirmation";
import ConfirmerAction from "@/components/ConfirmerAction";

export function BoutonSupprimerCarnet({ id }: { id: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { confirmer, propsModal } = useConfirmation();

  const handleSupprimer = async () => {
    const ok = await confirmer({
      titre: "Supprimer le rapport",
      message: "Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est irréversible.",
      labelConfirmer: "Supprimer",
      variante: "danger",
    });
    if (!ok) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/carnet/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erreur lors de la suppression");

      router.push("/carnet");
      router.refresh();
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <>
      <ConfirmerAction {...propsModal} />
      <button
        onClick={handleSupprimer}
        disabled={isLoading}
        className="bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        <IconeCorbeille className="w-4 h-4" />
        {isLoading ? "Suppression..." : "Supprimer"}
      </button>
    </>
  );
}
