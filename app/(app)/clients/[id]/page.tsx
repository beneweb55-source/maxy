"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  ArrowLeft,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MinusCircle,
} from "lucide-react";

interface ClientInfo {
  id: number;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  registre_commerce: string | null;
  nif: string | null;
}

interface Credit {
  id: number;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  statut: string;
  date_vente: string;
  date_echeance: string | null;
  vente: {
    id: number;
    prix_vente_reel: number;
    produit: { code_interne: string; reference: string };
  };
  paiements: {
    id: number;
    montant: number;
    mode_paiement: string;
    date_paiement: string;
    user: { username: string };
  }[];
}

interface VentesClient {
  id: number;
  prix_vente_reel: number;
  date_vente: string;
  type_vente: string;
  produit: { code_interne: string; reference: string };
}

interface DonneesClient {
  client: ClientInfo;
  credits: Credit[];
  ventes: VentesClient[];
  resume: {
    total_ventes: number;
    nb_ventes: number;
    total_credits: number;
    total_paye: number;
    total_restant: number;
  };
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function badgeStatut(statut: string) {
  switch (statut) {
    case "paye":
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600"><CheckCircle2 className="w-3 h-3" /> Paye</span>;
    case "partiellement_paye":
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600"><MinusCircle className="w-3 h-3" /> Partiel</span>;
    case "en_retard":
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600"><AlertTriangle className="w-3 h-3" /> Retard</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600"><Clock className="w-3 h-3" /> Impaye</span>;
  }
}

export default function PageClientDetail() {
  const params = useParams();
  const router = useRouter();
  const { afficher } = useToast();
  const clientId = Number(params.id);

  const [donnees, setDonnees] = useState<DonneesClient | null>(null);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<"credits" | "ventes" | "paiements">("credits");

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/credits?client_id=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        // Construire les donnees client depuis les credits
        const credits = data.credits || [];
        const client = credits.length > 0 ? credits[0].client : null;

        const resume = {
          total_ventes: 0,
          nb_ventes: credits.length,
          total_credits: data.totaux?.montant_total || 0,
          total_paye: data.totaux?.montant_paye || 0,
          total_restant: data.totaux?.montant_restant || 0,
        };

        setDonnees({
          client: client || { id: clientId, nom: "Client #" + clientId },
          credits,
          ventes: credits.map((c: any) => c.vente),
          resume,
        });
      }
    } catch {
      afficher("Erreur lors du chargement.", "erreur");
    } finally {
      setChargement(false);
    }
  }, [clientId, afficher]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-32 rounded-xl bg-brand-paper animate-pulse" />
        <div className="h-48 rounded-2xl bg-brand-paper animate-pulse" />
      </div>
    );
  }

  if (!donnees) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-brand-warm-grey">Client introuvable.</p>
        <button onClick={() => router.back()} className="mt-4 btn btn-primaire text-xs">Retour</button>
      </div>
    );
  }

  const { client, credits, resume } = donnees;

  // Tous les paiements de tous les credits
  const tousPaiements = credits.flatMap((c) =>
    c.paiements.map((p) => ({ ...p, credit_id: c.id, montant_restant_apres: 0 })),
  ).sort((a, b) => new Date(b.date_paiement).getTime() - new Date(a.date_paiement).getTime());

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-bold text-brand-warm-grey hover:text-brand-black transition"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* En-tete client */}
      <div className="p-4 rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey/60 dark:border-white/10">
        <h2 className="text-lg font-black text-brand-black dark:text-white">{client.nom}</h2>
        <div className="flex items-center gap-3 text-xs text-brand-warm-grey mt-1 flex-wrap">
          {client.telephone && <span>{client.telephone}</span>}
          {client.email && <span>{client.email}</span>}
          {client.adresse && <span>{client.adresse}</span>}
        </div>
      </div>

      {/* Resume financier */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-brand-orange/5 border border-brand-orange/20">
          <ShoppingCart className="w-4 h-4 text-brand-orange mb-1" />
          <p className="text-[10px] font-bold text-brand-warm-grey">Total achats</p>
          <p className="text-sm font-black text-brand-orange">{formaterDA(resume.total_ventes)}</p>
          <p className="text-[10px] text-brand-warm-grey">{resume.nb_ventes} achat(s)</p>
        </div>
        <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20">
          <CreditCard className="w-4 h-4 text-blue-600 mb-1" />
          <p className="text-[10px] font-bold text-brand-warm-grey">Total credits</p>
          <p className="text-sm font-black text-blue-600">{formaterDA(resume.total_credits)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-600 mb-1" />
          <p className="text-[10px] font-bold text-brand-warm-grey">Total paye</p>
          <p className="text-sm font-black text-green-600">{formaterDA(resume.total_paye)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-danger/5 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger mb-1" />
          <p className="text-[10px] font-bold text-brand-warm-grey">Total restant</p>
          <p className="text-sm font-black text-danger">{formaterDA(resume.total_restant)}</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-brand-light-grey/40 dark:border-white/10">
        {([
          { cle: "credits" as const, label: `Credits (${credits.length})` },
          { cle: "ventes" as const, label: `Ventes` },
          { cle: "paiements" as const, label: `Paiements (${tousPaiements.length})` },
        ]).map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              onglet === o.cle
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-brand-warm-grey hover:text-brand-black"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Contenu onglets */}
      {onglet === "credits" && (
        <div className="space-y-2">
          {credits.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-brand-light-grey/60 rounded-2xl">
              <p className="text-xs text-brand-warm-grey">Aucun credit pour ce client.</p>
            </div>
          ) : (
            credits.map((c) => (
              <div key={c.id} className="p-3 rounded-2xl border border-brand-light-grey/50 dark:border-white/10 bg-white dark:bg-brand-paper">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">Vente #{c.vente.id}</span>
                      {badgeStatut(c.statut)}
                    </div>
                    <p className="text-[10px] text-brand-warm-grey mt-0.5">
                      {c.vente.produit.reference} · {dateFr(c.date_vente)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-danger">{formaterDA(c.montant_restant)}</p>
                    <p className="text-[10px] text-brand-warm-grey">/ {formaterDA(c.montant_total)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {onglet === "ventes" && (
        <div className="space-y-2">
          {credits.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-brand-light-grey/60 rounded-2xl">
              <p className="text-xs text-brand-warm-grey">Aucune vente.</p>
            </div>
          ) : (
            credits.map((c) => (
              <div key={c.id} className="p-3 rounded-2xl border border-brand-light-grey/50 dark:border-white/10 bg-white dark:bg-brand-paper flex items-center justify-between">
                <div>
                  <span className="text-xs font-black">{c.vente.produit.reference}</span>
                  <p className="text-[10px] text-brand-warm-grey">{dateFr(c.date_vente)}</p>
                </div>
                <span className="text-xs font-black text-brand-black dark:text-white">
                  {formaterDA(c.montant_total)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {onglet === "paiements" && (
        <div className="space-y-2">
          {tousPaiements.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-brand-light-grey/60 rounded-2xl">
              <p className="text-xs text-brand-warm-grey">Aucun paiement.</p>
            </div>
          ) : (
            tousPaiements.map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-green-700">{formaterDA(p.montant)}</p>
                  <p className="text-[10px] text-brand-warm-grey">
                    {dateFr(p.date_paiement)} · {p.mode_paiement} · Credit #{p.credit_id}
                  </p>
                </div>
                <span className="text-[10px] text-brand-warm-grey">{p.user.username}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
