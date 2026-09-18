"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import DashboardCredits from "@/components/credits/DashboardCredits";
import ListeCredits from "@/components/credits/ListeCredits";
import DetailCredit from "@/components/credits/DetailCredit";

type VueCredits = "liste" | "detail";

export default function PageCredits() {
  const { afficher } = useToast();
  const [vue, setVue] = useState<VueCredits>("liste");
  const [creditSelectionne, setCreditSelectionne] = useState<number | null>(null);
  const [credits, setCredits] = useState<any[]>([]);
  const [totaux, setTotaux] = useState<any>(null);
  const [chargement, setChargement] = useState(true);

  const chargerCredits = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits || []);
        setTotaux(data.totaux || null);
      }
    } catch {
      afficher("Erreur lors du chargement des crédits.", "erreur");
    } finally {
      setChargement(false);
    }
  }, [afficher]);

  useEffect(() => {
    void chargerCredits();
  }, [chargerCredits]);

  const ouvrirDetail = (creditId: number) => {
    setCreditSelectionne(creditId);
    setVue("detail");
  };

  const retourListe = () => {
    setCreditSelectionne(null);
    setVue("liste");
    void chargerCredits();
  };

  const supprimerCredit = async (creditId: number) => {
    if (!window.confirm("Supprimer ce crédit ?")) return;
    try {
      const res = await fetch(`/api/credits/${creditId}`, { method: "DELETE" });
      if (res.ok) {
        afficher("Crédit supprimé.", "succes");
        void chargerCredits();
      } else {
        const err = await res.json();
        afficher(err.error || "Erreur lors de la suppression.", "erreur");
      }
    } catch {
      afficher("Erreur réseau.", "erreur");
    }
  };

  if (vue === "detail" && creditSelectionne !== null) {
    return (
      <DetailCredit
        creditId={creditSelectionne}
        onRetour={retourListe}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCredits totaux={totaux} chargement={chargement} />
      <ListeCredits
        credits={credits}
        chargement={chargement}
        onOuvrir={ouvrirDetail}
        onRafraichir={chargerCredits}
        onSupprimer={supprimerCredit}
      />
    </div>
  );
}
