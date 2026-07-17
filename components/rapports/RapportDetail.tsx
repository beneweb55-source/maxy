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
  cout_reparations: number;
  decision_rapport: DecisionRapport | null;
  derniere_note: string | null;
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
    <div className="mx-auto max-w-3xl space-y-4 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1>Rapport du lot n°{rapport.lot.id}</h1>
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
            <tbody className="divide-y divide-brand-light-grey/50">
              {rapport.resume_par_statut.map((r) => (
                <tr key={r.statut}>
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
            <tbody className="divide-y divide-brand-light-grey/50">
              {rapport.resume_par_categorie.map((r) => (
                <tr key={r.categorie}>
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
            <ul className="divide-y divide-brand-light-grey/50">
              {rapport.produits.filter(p => STATUTS_DECISION.includes(p.statut)).map((p) => (
                <li key={p.id} className="py-3">
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
        {['ok', 'en_vente', 'vendu'].some(s => rapport.produits.some(p => p.statut === s)) && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-bold mb-2">Produits OK (Aucune décision requise)</h4>
            <ul className="divide-y divide-brand-light-grey/50 text-sm">
              {rapport.produits.filter(p => !STATUTS_DECISION.includes(p.statut)).map((p) => (
                <li key={p.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-xs text-brand-warm-grey mr-2">{p.code_interne}</span>
                    <span className="font-semibold">{p.reference}</span>
                    {p.derniere_note && (
                      <span className="ml-2 text-xs text-brand-warm-grey italic">({p.derniere_note})</span>
                    )}
                  </div>
                  <BadgeStatut statut={p.statut} />
                </li>
              ))}
            </ul>
          </div>
        )}

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
