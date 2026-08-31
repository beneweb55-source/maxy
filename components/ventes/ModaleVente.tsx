"use client";

import React, { useState, useEffect } from "react";
import Modale from "@/components/Modale";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { IconeBillet, IconeAlerte, IconeEtiquette, IconeCoche } from "@/components/icons";

export interface ArticleAVendre {
  id: number;
  code_interne: string;
  reference: string;
  prix_achat?: number;
  prix_vente_fixe?: number | null;
  prix_vente_reel?: number | null;
  etiquette_imprimee?: boolean;
}

interface ModaleVenteProps {
  ouverte: boolean;
  unites: ArticleAVendre[];
  onFermer: () => void;
  onSucces: () => void;
}

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ModaleVente({
  ouverte,
  unites,
  onFermer,
  onSucces,
}: ModaleVenteProps) {
  const { afficher } = useToast();
  const [envoi, setEnvoi] = useState(false);

  // Prix par unité (permet de fixer le prix à la volée si non renseigné)
  const [prixMap, setPrixMap] = useState<{ [id: number]: number }>({});

  const [typeFacture, setTypeFacture] = useState("normale");
  const [modePaiement, setModePaiement] = useState("especes");
  const [especesRecues, setEspecesRecues] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [clientRc, setClientRc] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientAi, setClientAi] = useState("");
  const [clientNis, setClientNis] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [garantieMois, setGarantieMois] = useState(6);
  const [etiquetteValidee, setEtiquetteValidee] = useState(false);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  useEffect(() => {
    if (unites.length > 0) {
      const map: { [id: number]: number } = {};
      for (const u of unites) {
        map[u.id] =
          u.prix_vente_fixe ??
          u.prix_vente_reel ??
          (u.prix_achat && u.prix_achat > 0 ? Math.round(u.prix_achat * 1.25) : 0);
      }
      setPrixMap(map);
      setEspecesRecues("");
      setAvertissement(null);
      setEtiquetteValidee(unites.every((u) => u.etiquette_imprimee));
    }
  }, [unites]);

  const total = unites.reduce((sum, u) => sum + (prixMap[u.id] || 0), 0);
  const monnaieARendre = Number(especesRecues) > 0 ? Math.max(0, Number(especesRecues) - total) : 0;
  const articlesSansEtiquette = unites.filter((u) => !u.etiquette_imprimee);

  async function enregistrerVente(confirmer: boolean) {
    if (unites.length === 0) return;
    if (modePaiement === "credit" && !clientNom.trim()) {
      afficher("Veuillez saisir le nom du client pour une vente à crédit.", "erreur");
      return;
    }

    // Vérifier que chaque article a un prix valide
    for (const u of unites) {
      const p = prixMap[u.id];
      if (!p || p <= 0) {
        afficher(`Veuillez renseigner un prix de vente valide pour ${u.code_interne}.`, "erreur");
        return;
      }
    }

    setEnvoi(true);
    try {
      const commun = {
        canal: canal.trim() || undefined,
        date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
        client_nom: clientNom.trim() || undefined,
        client_tel: clientTel.trim() || undefined,
        client_adresse: clientAdresse.trim() || undefined,
        client_rc: clientRc.trim() || undefined,
        client_nif: clientNif.trim() || undefined,
        client_ai: clientAi.trim() || undefined,
        client_nis: clientNis.trim() || undefined,
        type_facture: typeFacture,
        mode_paiement: modePaiement,
        etiquette_imprimee: etiquetteValidee || undefined,
        confirmer: confirmer || undefined,
      };

      const res =
        unites.length === 1
          ? await fetch("/api/ventes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_id: unites[0]!.id,
                prix_vente_reel: prixMap[unites[0]!.id],
                ...commun,
              }),
            })
          : await fetch("/api/ventes/groupee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_ids: unites.map((u) => u.id),
                prix_total: total,
                ...commun,
              }),
            });

      const corps = (await res.json().catch(() => null)) as {
        ok?: boolean;
        confirmation_required?: boolean;
        message?: string;
        error?: string;
        facture_id?: number;
        facture_numero?: string;
      } | null;

      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la vente.", "erreur");
        return;
      }

      if (corps?.confirmation_required) {
        setAvertissement(corps.message ?? "Prix sous la marge minimum. Confirmer ?");
        return;
      }

      afficher(
        `Vente enregistrée avec succès — facture ${corps?.facture_numero ?? ""} créée.`
      );
      if (corps?.facture_id) {
        window.open(`/factures/${corps.facture_id}`, "_blank");
      }
      onSucces();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale
      titre={`Vente & Facturation — ${unites.length} article${unites.length > 1 ? "s" : ""}`}
      ouverte={ouverte}
      onFermer={onFermer}
    >
      <div className="space-y-4 max-h-[80dvh] overflow-y-auto pr-1">
        {/* Liste des articles avec ajustement de prix à la volée */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white">
            Articles à vendre ({unites.length})
          </label>
          <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl bg-brand-light-grey/25 p-3 text-xs">
            {unites.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded text-[11px]">
                      {u.code_interne}
                    </span>
                    <span className="font-bold text-brand-black dark:text-white truncate">
                      {u.reference}
                    </span>
                  </div>
                  {u.prix_achat !== undefined && (
                    <span className="text-[10px] text-brand-warm-grey">
                      Achat: {formaterDA(u.prix_achat)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-brand-warm-grey">Prix Vente:</span>
                  <input
                    type="number"
                    value={prixMap[u.id] ?? ""}
                    onChange={(e) =>
                      setPrixMap({ ...prixMap, [u.id]: Number(e.target.value) || 0 })
                    }
                    className="champ h-8 w-28 text-right font-mono font-bold text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs font-bold text-brand-orange">DA</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center p-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-black dark:text-white">
            Total à Encaisser
          </span>
          <span className="text-xl font-black font-mono text-brand-orange">{formaterDA(total)}</span>
        </div>

        {/* Type de Document & Mode de Paiement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="libelle mb-1.5" htmlFor="type-facture-unifie">
              Type de Facture
            </label>
            <select
              id="type-facture-unifie"
              value={typeFacture}
              onChange={(e) => setTypeFacture(e.target.value)}
              className="champ text-xs font-bold"
            >
              <option value="normale">Facture Normale (Standard / Ticket)</option>
              <option value="tva">Facture avec TVA</option>
              <option value="proforma">Devis / Facture Proforma</option>
            </select>
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="mode-paiement-unifie">
              Mode de Paiement
            </label>
            <select
              id="mode-paiement-unifie"
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="champ text-xs font-bold"
            >
              <option value="especes">Espèces</option>
              <option value="carte">Carte Bancaire / CIB</option>
              <option value="virement">Virement CCP</option>
              <option value="cheque">Chèque</option>
              <option value="credit">Vente à Crédit</option>
            </select>
          </div>
        </div>

        {/* Calcul de Monnaie si Espèces */}
        {modePaiement === "especes" && (
          <div className="p-3.5 rounded-xl bg-brand-light-grey/25 border border-brand-light-grey/60 space-y-2">
            <label className="libelle text-xs" htmlFor="especes-recues-unifie">
              Montant Reçu en Espèces (DA)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="especes-recues-unifie"
                type="number"
                value={especesRecues}
                onChange={(e) => setEspecesRecues(e.target.value)}
                placeholder={String(total)}
                className="champ flex-1 font-bold font-mono text-base"
              />
              {monnaieARendre > 0 && (
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold uppercase text-brand-grey">Monnaie à rendre</span>
                  <span className="text-base font-black font-mono text-succes">{formaterDA(monnaieARendre)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RÈGLE 2 ERP/WMS : Contrôle Étiquette Produit */}
        {articlesSansEtiquette.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="toggle-etiquette-unifie"
                className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer select-none"
              >
                Avez-vous imprimé et collé l&apos;étiquette sur les articles ({articlesSansEtiquette.length}) ?
              </label>
              <input
                id="toggle-etiquette-unifie"
                type="checkbox"
                checked={etiquetteValidee}
                onChange={(e) => setEtiquetteValidee(e.target.checked)}
                className="toggle toggle-warning h-6 w-11 cursor-pointer"
              />
            </div>
            {!etiquetteValidee && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
                <span className="text-[11px] text-amber-800 dark:text-amber-300">
                  Sans confirmation, l&apos;article sera réservé (Produit Commandé).
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ids = articlesSansEtiquette.map((l) => l.id);
                    window.open(`/imprimer-etiquettes?ids=${ids.join(",")}`, "_blank");
                    setEtiquetteValidee(true);
                  }}
                  className="btn btn-xs bg-brand-orange text-white hover:bg-brand-orange/90 font-bold"
                >
                  Imprimer les étiquettes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Coordonnées Client & Canal */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="libelle mb-1.5" htmlFor="client-nom-unifie">
              Nom du client {modePaiement === "credit" ? "*" : ""}
            </label>
            <input
              id="client-nom-unifie"
              type="text"
              value={clientNom}
              onChange={(e) => setClientNom(e.target.value)}
              placeholder="Ex. Karim M."
              className="champ"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="client-tel-unifie">
              Téléphone
            </label>
            <input
              id="client-tel-unifie"
              type="tel"
              value={clientTel}
              onChange={(e) => setClientTel(e.target.value)}
              placeholder="0X XX XX XX XX"
              className="champ"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="date-vente-unifie">
              Date de vente
            </label>
            <input
              id="date-vente-unifie"
              type="date"
              value={dateVente}
              max={aujourdhuiIso()}
              onChange={(e) => setDateVente(e.target.value)}
              className="champ font-mono"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="canal-unifie">
              Canal de Vente
            </label>
            <input
              id="canal-unifie"
              type="text"
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              placeholder="Boutique, Ouedkniss, Facebook…"
              className="champ"
            />
          </div>
        </div>

        {/* Accordéon Informations Légales & Entreprise */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-bold text-brand-orange hover:underline outline-none">
            + Informations légales pour facture proforma / entreprise (Optionnel)
          </summary>
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-brand-light-grey/20 rounded-xl text-xs">
            <div>
              <label className="libelle mb-1" htmlFor="client-adresse-unifie">Adresse</label>
              <input
                id="client-adresse-unifie"
                type="text"
                value={clientAdresse}
                onChange={(e) => setClientAdresse(e.target.value)}
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1" htmlFor="client-rc-unifie">RC (Registre Commerce)</label>
              <input
                id="client-rc-unifie"
                type="text"
                value={clientRc}
                onChange={(e) => setClientRc(e.target.value)}
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1" htmlFor="client-nif-unifie">NIF</label>
              <input
                id="client-nif-unifie"
                type="text"
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1" htmlFor="client-nis-unifie">NIS</label>
              <input
                id="client-nis-unifie"
                type="text"
                value={clientNis}
                onChange={(e) => setClientNis(e.target.value)}
                className="champ"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="libelle mb-1" htmlFor="client-ai-unifie">Article d&apos;imposition (AI)</label>
              <input
                id="client-ai-unifie"
                type="text"
                value={clientAi}
                onChange={(e) => setClientAi(e.target.value)}
                className="champ"
              />
            </div>
          </div>
        </details>

        {/* Garantie Matériel */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-brand-light-grey/60 bg-brand-light-grey/15 text-xs">
          <span className="font-bold text-brand-black dark:text-white">Garantie Matériel :</span>
          <select
            value={garantieMois}
            onChange={(e) => setGarantieMois(Number(e.target.value))}
            className="select select-sm rounded-lg font-bold border-brand-light-grey text-xs"
          >
            <option value={1}>1 Mois</option>
            <option value={3}>3 Mois</option>
            <option value={6}>6 Mois (Standard)</option>
            <option value={12}>12 Mois (1 An)</option>
            <option value={24}>24 Mois (2 Ans)</option>
          </select>
        </div>

        {avertissement && (
          <div className="flex items-start gap-2 rounded-xl bg-brand-glow/40 px-3 py-2 text-xs text-brand-smooth">
            <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
            {avertissement}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-light-grey/50">
          {avertissement ? (
            <>
              <button
                type="button"
                onClick={() => setAvertissement(null)}
                className="btn btn-secondaire text-xs"
              >
                Revoir le prix
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void enregistrerVente(true)}
                className="btn btn-primaire text-xs"
              >
                Vendre quand même
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={envoi || total <= 0}
              onClick={() => void enregistrerVente(false)}
              className="btn btn-primaire w-full sm:w-auto min-h-[46px] text-xs font-bold shadow-lg"
            >
              <IconeBillet taille={16} />
              {envoi ? "Enregistrement en cours..." : "Valider & Générer la Facture"}
            </button>
          )}
        </div>
      </div>
    </Modale>
  );
}
