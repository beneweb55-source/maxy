"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DecisionRapport, Role, StatutLot, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT_LOT, libelleStatut } from "@/lib/statuts";
import {
  IconeCoche,
  IconeCocheCercle,
  IconeFlecheDroite,
  IconeFlecheGauche,
  IconeImprimante,
  IconeNote,
} from "@/components/icons";

interface ProduitRapport {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  prix_achat: number;
  prix_vente_fixe: number | null;
  cout_reparations: number;
  decision_rapport: DecisionRapport | null;
  derniere_note: string | null;
}

interface GroupeProduit {
  cle: string;
  reference: string;
  categorie: string;
  prix_vente_fixe: number | null;
  quantite: number;
  achatMin: number;
  achatMax: number;
  nbVendus: number;
  nbSansPrix: number;
}

// Regroupe les exemplaires identiques (même référence, catégorie et prix de
// vente fixé) en une seule ligne, en conservant l'ordre d'apparition et en
// comptant le nombre d'exemplaires. Le statut n'est plus porté par un badge
// répété sur chaque ligne : seuls les écarts au statut « en vente » (vendus,
// sans prix) sont comptés pour un affichage discret.
function regrouperProduits(produits: ProduitRapport[]): GroupeProduit[] {
  const groupes = new Map<string, GroupeProduit>();
  for (const p of produits) {
    const cle = `${p.reference} ${p.categorie} ${p.prix_vente_fixe ?? "null"}`;
    const existant = groupes.get(cle);
    if (existant) {
      existant.quantite += 1;
      existant.achatMin = Math.min(existant.achatMin, p.prix_achat);
      existant.achatMax = Math.max(existant.achatMax, p.prix_achat);
      if (p.statut === "vendu") existant.nbVendus += 1;
      if (p.statut === "ok") existant.nbSansPrix += 1;
    } else {
      groupes.set(cle, {
        cle,
        reference: p.reference,
        categorie: p.categorie,
        prix_vente_fixe: p.prix_vente_fixe,
        quantite: 1,
        achatMin: p.prix_achat,
        achatMax: p.prix_achat,
        nbVendus: p.statut === "vendu" ? 1 : 0,
        nbSansPrix: p.statut === "ok" ? 1 : 0,
      });
    }
  }
  return Array.from(groupes.values());
}

interface RapportDto {
  lot: {
    id: number;
    fournisseur: string;
    date_entree: string;
    statut_lot: StatutLot;
    description: string | null;
    cout_global_declare: number | null;
  };
  resume_par_statut: { statut: StatutProduit; nombre: number; valeur_achat: number }[];
  resume_par_categorie: { categorie: string; nombre: number; valeur_achat: number }[];
  produits: ProduitRapport[];
}

const STATUTS_DECISION: readonly StatutProduit[] = ["a_reparer", "manque_piece", "hs"];

const LIBELLES_DECISION: Record<DecisionRapport, string> = {
  reparer: "Réparer",
  vendre_en_etat: "Vendre en l'état",
  pieces_detachees: "Pièces détachées",
};

export default function RapportDetail({ lotId, role }: { lotId: number; role: Role }) {
  const { afficher } = useToast();
  const [rapport, setRapport] = useState<RapportDto | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Map<number, DecisionRapport>>(new Map());
  const [envoi, setEnvoi] = useState(false);

  const estGerant = role === "gerant";

  const rafraichir = useCallback(async () => {
    try {
      const res = await fetch(`/api/rapports/${lotId}`);
      const corps = (await res.json().catch(() => null)) as
        | RapportDto
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      const donnees = corps as RapportDto;
      setRapport(donnees);
      setErreur(null);
      const initiales = new Map<number, DecisionRapport>();
      for (const p of donnees.produits) {
        if (p.decision_rapport) initiales.set(p.id, p.decision_rapport);
      }
      setDecisions(initiales);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, [lotId]);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  if (erreur && !rapport) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}{" "}
        <Link href="/rapports" className="underline">
          Retour aux rapports
        </Link>
      </div>
    );
  }
  if (!rapport) return <p className="p-4 text-sm text-brand-warm-grey">Chargement du rapport…</p>;

  const enAttente = rapport.lot.statut_lot === "teste";
  const concernes = rapport.produits.filter((p) => STATUTS_DECISION.includes(p.statut));
  const decisionsCompletes = concernes.every((p) => decisions.has(p.id));
  const infosLot = INFOS_STATUT_LOT[rapport.lot.statut_lot];
  const produitsOk = rapport.produits.filter((p) => p.statut === "ok");

  async function enregistrerDecisions(): Promise<boolean> {
    if (decisions.size === 0) return true;
    const res = await fetch(`/api/rapports/${lotId}/decisions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisions: Array.from(decisions.entries()).map(([produit_id, decision]) => ({
          produit_id,
          decision,
        })),
      }),
    });
    if (!res.ok) {
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      afficher(corps?.error ?? "Erreur lors de l'enregistrement des décisions.", "erreur");
      return false;
    }
    return true;
  }

  async function sauvegarder() {
    setEnvoi(true);
    try {
      if (await enregistrerDecisions()) {
        afficher("Décisions enregistrées.");
        await rafraichir();
      }
    } finally {
      setEnvoi(false);
    }
  }

  async function valider() {
    setEnvoi(true);
    try {
      if (!(await enregistrerDecisions())) return;
      const res = await fetch(`/api/rapports/${lotId}/validation`, { method: "POST" });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la validation.", "erreur");
        return;
      }
      afficher("Rapport validé — Raouf a été notifié. Prochaine étape : fixer les prix.");
      await rafraichir();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-entree print:max-w-none print:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50 print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Rapport du lot n°{rapport.lot.id}</h1>
        <div className="flex items-center gap-2">
          <Link href="/rapports" className="lien inline-flex items-center gap-1.5 text-sm">
            <IconeFlecheGauche taille={14} />
            Rapports
          </Link>
          <button type="button" onClick={() => window.print()} className="btn btn-secondaire">
            <IconeImprimante taille={15} />
            Imprimer (A4)
          </button>
        </div>
      </div>

      {!enAttente && estGerant && produitsOk.length > 0 && (
        <div className="bandeau-info flex flex-wrap items-center justify-between gap-2 print:hidden">
          <span className="inline-flex items-center gap-2">
            <IconeCocheCercle taille={15} />
            Rapport validé — {produitsOk.length} produit{produitsOk.length > 1 ? "s" : ""} OK en
            attente de prix.
          </span>
          <Link
            href={`/inventaire?statuts=ok&lot=${rapport.lot.id}`}
            className="btn btn-crystal px-3 py-1.5"
          >
            Fixer les prix
            <IconeFlecheDroite taille={14} />
          </Link>
        </div>
      )}

      <div className="carte print:border-0 print:p-0">
        <img src="/brand/solutionmaxi-logo-clair.svg" alt="SolutionMaxi" className="h-6 w-auto" />
        <div className="hidden print:flex mb-6 items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-brand-black">
              MAXY
            </h1>
            <p className="text-xs font-semibold tracking-widest text-brand-warm-grey">
              GESTION INFORMATIQUE
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-wider text-brand-black">Rapport de lot</h2>
            <p className="text-sm font-semibold text-brand-warm-grey">LOT N°{rapport.lot.id}</p>
          </div>
        </div>
        <h2 className="hidden text-lg font-bold print:block">
          Rapport de test — Lot n°{rapport.lot.id}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-brand-smooth">
            <strong>{rapport.lot.fournisseur}</strong> · entré le{" "}
            {new Date(rapport.lot.date_entree).toLocaleDateString("fr-FR")}
            {rapport.lot.description ? ` · ${rapport.lot.description}` : ""}
          </p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${infosLot.badge}`}>
            {infosLot.libelle}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="carte print:border-0 print:p-0">
          <h3 className="libelle text-brand-smooth">Résumé par statut</h3>
          <table className="mt-2 w-full text-sm">
            <tbody className="">
              {rapport.resume_par_statut.map((r) => (
                <tr key={r.statut} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                  <td className="py-1.5">
                    <BadgeStatut statut={r.statut} />
                  </td>
                  <td className="py-1.5 text-right">{r.nombre}</td>
                  <td className="py-1.5 text-right font-semibold">
                    {formaterDA(r.valeur_achat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="carte print:border-0 print:p-0">
          <h3 className="libelle text-brand-smooth">Valeur d'achat par catégorie</h3>
          <table className="mt-2 w-full text-sm">
            <tbody className="">
              {rapport.resume_par_categorie.map((r) => (
                <tr key={r.categorie} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                  <td className="py-1.5">{r.categorie}</td>
                  <td className="py-1.5 text-right">{r.nombre}</td>
                  <td className="py-1.5 text-right font-semibold">
                    {formaterDA(r.valeur_achat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="carte print:border-0 print:p-0">
        <h3 className="libelle text-brand-smooth">
          Produits et décisions{" "}
          {concernes.length > 0 && (
            <span className={decisionsCompletes ? "text-succes" : "text-brand-orange"}>
              ({concernes.filter((p) => decisions.has(p.id)).length}/{concernes.length} décision
              {concernes.length > 1 ? "s" : ""})
            </span>
          )}
        </h3>

        {STATUTS_DECISION.some(s => rapport.produits.some(p => p.statut === s)) && (
          <div className="mt-4">
            <h4 className="font-bold mb-2">Décisions requises (À réparer, Manque pièce, HS)</h4>
            <ul className="">
              {rapport.produits.filter(p => STATUTS_DECISION.includes(p.statut)).map((p) => (
                <li key={p.id} className="py-3 ligne-table border-b border-brand-light-grey/30 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/produits/${p.id}`}
                        className="text-sm font-semibold transition hover:text-brand-crystal hover:underline print:no-underline"
                      >
                        <span className="font-mono text-xs text-brand-warm-grey">
                          {p.code_interne}
                        </span>{" "}
                        {p.reference}
                      </Link>
                      <p className="text-xs text-brand-warm-grey">
                        {p.categorie} · achat {formaterDA(p.prix_achat)}
                        {p.cout_reparations > 0 &&
                          ` · réparations ${formaterDA(p.cout_reparations)}`}
                      </p>
                      {p.derniere_note && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-brand-smooth font-semibold">
                          <IconeNote taille={13} className="mt-0.5 shrink-0 text-brand-warm-grey" />
                          {p.derniere_note}
                        </p>
                      )}
                    </div>
                    <BadgeStatut statut={p.statut} />
                  </div>
                  {enAttente && estGerant && (
                    <div className="mt-2 flex flex-wrap gap-3 print:hidden">
                      {(Object.keys(LIBELLES_DECISION) as DecisionRapport[]).map((d) => (
                        <label key={d} className={`flex items-center gap-1.5 text-sm cursor-pointer border p-2 rounded transition ${decisions.get(p.id) === d ? "bg-brand-orange/10 border-brand-orange font-semibold" : "hover:bg-brand-light-grey/20"}`}>
                          <input
                            type="radio"
                            name={`decision-${p.id}`}
                            checked={decisions.get(p.id) === d}
                            onChange={() => setDecisions(new Map(decisions).set(p.id, d))}
                            className="accent-brand-orange"
                          />
                          {LIBELLES_DECISION[d]}
                        </label>
                      ))}
                    </div>
                  )}
                  {(!enAttente || !estGerant) && (
                    <p className="mt-1 text-xs">
                      Décision :{" "}
                      <span className="font-bold text-brand-orange">
                        {p.decision_rapport ? LIBELLES_DECISION[p.decision_rapport] : "en attente"}
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {['ok', 'en_vente', 'vendu'].some(s => rapport.produits.some(p => p.statut === s)) && (() => {
          const produitsSection = rapport.produits.filter(p => !STATUTS_DECISION.includes(p.statut));
          const nbEnVente = produitsSection.filter(p => p.statut === "en_vente").length;
          const nbVendus = produitsSection.filter(p => p.statut === "vendu").length;
          const nbATarifer = produitsSection.filter(p => p.statut === "ok").length;
          return (
            <div className="mt-6 border-t pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold">Produits OK (Aucune décision requise)</h4>
                <span className="rounded-full bg-brand-light-grey/40 px-2.5 py-0.5 text-xs font-semibold text-brand-smooth">
                  {[
                    nbEnVente > 0 && `${nbEnVente} en vente`,
                    nbVendus > 0 && `${nbVendus} vendu${nbVendus > 1 ? "s" : ""}`,
                    nbATarifer > 0 && `${nbATarifer} à tarifer`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-brand-warm-grey">
                <span>Produit</span>
                <span className="flex gap-4">
                  <span className="w-24 text-right">Prix achat</span>
                  <span className="w-24 text-right text-brand-orange">Prix vente</span>
                </span>
              </div>
              <ul className="text-sm">
                {regrouperProduits(produitsSection).map((g) => (
                  <li
                    key={g.cle}
                    className="py-2 flex justify-between items-center gap-3 ligne-table border-b border-brand-light-grey/30 last:border-0"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold">{g.reference}</span>
                      {g.quantite > 1 && (
                        <span className="ml-2 rounded-full bg-brand-light-grey/50 px-2 py-0.5 text-xs font-semibold text-brand-smooth">
                          ×{g.quantite}
                        </span>
                      )}
                      <span className="ml-2 text-xs text-brand-warm-grey">{g.categorie}</span>
                      {(g.nbVendus > 0 || g.nbSansPrix > 0) && (
                        <span className="ml-2 text-[11px] italic text-brand-grey">
                          {[
                            g.nbVendus > 0 && `${g.nbVendus} vendu${g.nbVendus > 1 ? "s" : ""}`,
                            g.nbSansPrix > 0 && `${g.nbSansPrix} sans prix`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-4 tabular-nums">
                      <div className="w-24 text-right text-xs">
                        <span className="block text-[10px] font-semibold uppercase text-brand-grey mb-0.5">Achat unitaire</span>
                        <span className="font-semibold text-brand-smooth">
                          {g.achatMin === g.achatMax
                            ? formaterDA(g.achatMin)
                            : `${formaterDA(g.achatMin)} – ${formaterDA(g.achatMax)}`}
                        </span>
                      </div>
                      <div className="w-24 text-right rounded-lg bg-brand-glow/25 px-2.5 py-1 text-sm">
                        <span className="block text-[10px] font-semibold uppercase text-brand-orange/70 mb-0.5">Vente</span>
                        <span className="font-bold text-brand-orange">
                          {g.prix_vente_fixe !== null ? formaterDA(g.prix_vente_fixe) : "—"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {concernes.length === 0 && (
          <p className="mt-2 text-sm text-brand-warm-grey">
            Aucun produit en {libelleStatut("a_reparer")}, {libelleStatut("manque_piece")} ou{" "}
            {libelleStatut("hs")} : aucune décision requise.
          </p>
        )}
      </section>

      {enAttente && estGerant && (
        <div className="flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            disabled={envoi || decisions.size === 0}
            onClick={() => void sauvegarder()}
            className="btn btn-secondaire"
          >
            Enregistrer les décisions
          </button>
          <button
            type="button"
            disabled={envoi || !decisionsCompletes}
            onClick={() => void valider()}
            title={
              decisionsCompletes
                ? "Appliquer les décisions et valider le lot"
                : "Validation bloquée : toutes les décisions ne sont pas prises"
            }
            className="btn btn-primaire"
          >
            <IconeCoche taille={15} />
            Valider le rapport
          </button>
        </div>
      )}
    </div>
  );
}
