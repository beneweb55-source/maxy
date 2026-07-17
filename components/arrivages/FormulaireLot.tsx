"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { IconeFlecheGauche } from "@/components/icons";

export default function FormulaireLot() {
  const router = useRouter();
  const { afficher } = useToast();

  const [fournisseur, setFournisseur] = useState("");
  const [description, setDescription] = useState("");
  const [coutDeclare, setCoutDeclare] = useState("");
  const [quantiteAttendue, setQuantiteAttendue] = useState("");
  const [fournisseurs, setFournisseurs] = useState<string[]>([]);

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
    if (coutDeclare.trim() && (!Number.isInteger(declare) || declare < 0)) {
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
          cout_global_declare: coutDeclare.trim() ? declare : undefined,
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
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1>Nouveau lot (Arrivage)</h1>
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
          <label htmlFor="cout" className="libelle mb-1.5">
            Coût global déclaré (DA) — optionnel
          </label>
          <input
            id="cout"
            type="number"
            min={0}
            step={1}
            value={coutDeclare}
            onChange={(e) => setCoutDeclare(e.target.value)}
            placeholder="Montant payé au fournisseur"
            className="champ"
          />
        </div>

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
