"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { useToast } from "@/components/toast";
import { IconeFlecheGauche } from "@/components/icons";

type ModeCout = "manuel" | "auto";

export default function FormulaireLot({ role }: { role: Role }) {
  const router = useRouter();
  const { afficher } = useToast();

  const [fournisseur, setFournisseur] = useState("");
  const [description, setDescription] = useState("");
  const [modeCout, setModeCout] = useState<ModeCout>("manuel");
  const [coutDeclare, setCoutDeclare] = useState("");
  const [quantiteAttendue, setQuantiteAttendue] = useState("");
  const [fournisseurs, setFournisseurs] = useState<string[]>([]);

  const estGerant = role === "gerant";

  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void fetch("/api/lots")
      .then((r) => (r.ok ? (r.json() as Promise<{ fournisseurs: string[] }>) : null))
      .then((d) => d && setFournisseurs(d.fournisseurs))
      .catch(() => undefined);
  }, []);

  async function creerLot() {
    setErreur(null);

    if (!fournisseur.trim()) {
      setErreur("Le fournisseur est obligatoire.");
      return;
    }

    const declare = Number(coutDeclare);
    if (modeCout === "manuel" && coutDeclare.trim() && (!Number.isInteger(declare) || declare < 0)) {
      setErreur("Le coût global déclaré doit être un entier positif en DA.");
      return;
    }

    const attendus = Number(quantiteAttendue);
    if (!quantiteAttendue.trim() || !Number.isInteger(attendus) || attendus <= 0) {
      setErreur("La quantité attendue doit être un entier strictement positif.");
      return;
    }

    setEnvoi(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fournisseur: fournisseur.trim(),
          description: description.trim() || undefined,
          mode_cout: modeCout,
          cout_global_declare:
            modeCout === "manuel" && coutDeclare.trim() ? declare : undefined,
          quantite_attendue: attendus,
        }),
      });

      const corps = (await res.json().catch(() => null)) as
        | { lot_id?: number; error?: string }
        | null;

      if (!res.ok) {
        setErreur(corps?.error ?? "Erreur lors de la création du lot.");
        return;
      }

      afficher(
        `Lot n°${corps?.lot_id} créé — ${attendus} produits attendus. Raouf a été notifié pour le remplissage.`
      );
      router.push(`/lots/${corps?.lot_id}`);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-entree">
      <div className="flex items-center justify-between pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Nouveau lot (Arrivage)</h1>
        <Link href="/arrivages" className="lien inline-flex items-center gap-1.5 text-sm">
          <IconeFlecheGauche taille={14} />
          Retour aux arrivages
        </Link>
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}

      <div className="carte space-y-4">
        <div>
          <label htmlFor="fournisseur" className="libelle mb-1.5">
            Fournisseur *
          </label>
          <input
            id="fournisseur"
            type="text"
            list="fournisseurs-existants"
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
            autoFocus
            className="champ"
          />
          <datalist id="fournisseurs-existants">
            {fournisseurs.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="quantite" className="libelle mb-1.5">
            Quantité attendue de produits *
          </label>
          <input
            id="quantite"
            type="number"
            min={1}
            step={1}
            value={quantiteAttendue}
            onChange={(e) => setQuantiteAttendue(e.target.value)}
            placeholder="Ex: 50"
            className="champ"
          />
        </div>

        <div>
          <label htmlFor="description" className="libelle mb-1.5">
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. Lot mixte bureautique"
            className="champ"
          />
        </div>

        <div>
          <label className="libelle mb-1.5">Mode de coût du lot</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModeCout("manuel")}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                modeCout === "manuel"
                  ? "border-brand-orange bg-brand-glow/25 text-brand-black"
                  : "border-brand-light-grey text-brand-warm-grey hover:border-brand-grey"
              }`}
            >
              <span className="block font-semibold">Manuel</span>
              <span className="block text-xs">Coût global fixe saisi à la main</span>
            </button>
            <button
              type="button"
              onClick={() => setModeCout("auto")}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                modeCout === "auto"
                  ? "border-brand-orange bg-brand-glow/25 text-brand-black"
                  : "border-brand-light-grey text-brand-warm-grey hover:border-brand-grey"
              }`}
            >
              <span className="block font-semibold">Automatique</span>
              <span className="block text-xs">Calculé depuis les produits, à valider</span>
            </button>
          </div>
        </div>

        {modeCout === "manuel" ? (
          <div>
            <label htmlFor="cout" className="libelle mb-1.5">
              Coût global déclaré (DA) — optionnel
            </label>
            <input
              id="cout"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={coutDeclare}
              onChange={(e) => setCoutDeclare(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Montant payé au fournisseur"
              className="champ"
            />
            <p className="mt-1.5 text-xs text-brand-warm-grey">
              {estGerant
                ? "Renseigné, ce montant est retiré immédiatement de la caisse (achat du lot)."
                : "Le retrait en caisse sera validé ensuite par le gérant."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-brand-light-grey bg-brand-paper px-3 py-2.5 text-xs text-brand-warm-grey">
            Le coût du lot sera <strong className="text-brand-black">calculé automatiquement</strong>{" "}
            en additionnant le prix d'achat de chaque produit ajouté, puis{" "}
            <strong className="text-brand-black">validé manuellement</strong> par le gérant pour
            déclencher le retrait en caisse.
          </div>
        )}

        <div className="text-right pt-2">
          <button
            type="button"
            onClick={() => void creerLot()}
            disabled={envoi || !fournisseur.trim() || !quantiteAttendue.toString().trim()}
            className="btn btn-primaire w-full justify-center"
          >
            {envoi ? "Création…" : "Créer le lot"}
          </button>
        </div>
      </div>
    </div>
  );
}
