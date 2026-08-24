"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconeCorbeille } from "@/components/icons";

export function BoutonSupprimerCarnet({ id }: { id: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSupprimer = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est irréversible.")) {
      return;
    }

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
      alert("Impossible de supprimer le rapport.");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSupprimer}
      disabled={isLoading}
      className="bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
    >
      <IconeCorbeille className="w-4 h-4" />
      {isLoading ? "Suppression..." : "Supprimer"}
    </button>
  );
}
