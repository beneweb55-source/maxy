"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import Modale from "@/components/Modale";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { MISES_A_JOUR } from "@/lib/mises-a-jour";
import {
  IconeAlerte,
  IconeBanque,
  IconeBaseDeDonnees,
  IconeBillet,
  IconeBouclier,
  IconeCadenasOuvert,
  IconeCamion,
  IconeCloche,
  IconeCle,
  IconeCorbeille,
  IconeCurseurs,
  IconeEnregistrer,
  IconeHistorique,
  IconePanier,
  IconePaquet,
  IconePortefeuille,
  IconeUtilisateurs,
} from "@/components/icons";

interface ReponseAdmin {
  soldes: { total: number; reserve: number; disponible: number };
  parametres: { 
    marge_minimum_pct: number; 
    objectif_reserve: number; 
    pct_reinvest: number; 
    pct_reserve: number; 
    pct_parts: number; 
    pct_frais: number;
    entreprise_nom: string;
    entreprise_adresse: string;
    entreprise_tel: string;
    entreprise_rc: string;
    entreprise_nif: string;
    entreprise_nis: string;
    entreprise_art: string;
    entreprise_rib: string | null;
    entreprise_cachet: string | null;
  };
  compteurs: {
    lots: number;
    produits: number;
    ventes: number;
    ventes_annulees: number;
    mouvements: number;
    reparations: number;
    notifications: number;
  };
  dernier_mouvement: { date: string; solde_apres: number } | null;
  utilisateurs: {
    id: number;
    username: string;
    role: Role;
    login_attempts: number;
    verrouille: boolean;
    locked_until: string | null;
  }[];
}

const LIBELLES_ROLE: Record<Role, string> = {
  gerant: "Gérant",
  technicien: "Technicien",
  dev: "Dev",
  social_media: "Social Media Manager",
};

export default function AdminClient() {
  const { afficher } = useToast();
  const [donnees, setDonnees] = useState<ReponseAdmin | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [margeMin, setMargeMin] = useState("");
  const [objectifReserve, setObjectifReserve] = useState("");
  const [pctReinvest, setPctReinvest] = useState("");
  const [pctReserve, setPctReserve] = useState("");
  const [pctParts, setPctParts] = useState("");
  const [pctFrais, setPctFrais] = useState("");
  
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [entrepriseAdresse, setEntrepriseAdresse] = useState("");
  const [entrepriseTel, setEntrepriseTel] = useState("");
  const [entrepriseRc, setEntrepriseRc] = useState("");
  const [entrepriseNif, setEntrepriseNif] = useState("");
  const [entrepriseNis, setEntrepriseNis] = useState("");
  const [entrepriseArt, setEntrepriseArt] = useState("");
  const [entrepriseRib, setEntrepriseRib] = useState("");
  const [entrepriseCachet, setEntrepriseCachet] = useState<string | null>(null);

  const [parametresCharges, setParametresCharges] = useState(false);

  const [nouveauSolde, setNouveauSolde] = useState("");
  const [motifAjustement, setMotifAjustement] = useState("");
  const [confirmationAjustement, setConfirmationAjustement] = useState<string | null>(null);

  const [modalReset, setModalReset] = useState(false);
  const [texteReset, setTexteReset] = useState("");

  const rafraichir = useCallback(async () => {
    try {
      const res = await fetch("/api/admin");
      const corps = (await res.json().catch(() => null)) as
        | ReponseAdmin
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      const d = corps as ReponseAdmin;
      setDonnees(d);
      setErreur(null);
      setParametresCharges((deja) => {
        if (!deja) {
          setMargeMin(String(d.parametres.marge_minimum_pct));
          setObjectifReserve(String(d.parametres.objectif_reserve));
          setPctReinvest(String(d.parametres.pct_reinvest));
          setPctReserve(String(d.parametres.pct_reserve));
          setPctParts(String(d.parametres.pct_parts));
          setPctFrais(String(d.parametres.pct_frais));
          setEntrepriseNom(d.parametres.entreprise_nom);
          setEntrepriseAdresse(d.parametres.entreprise_adresse);
          setEntrepriseTel(d.parametres.entreprise_tel);
          setEntrepriseRc(d.parametres.entreprise_rc);
          setEntrepriseNif(d.parametres.entreprise_nif);
          setEntrepriseNis(d.parametres.entreprise_nis);
          setEntrepriseArt(d.parametres.entreprise_art);
          setEntrepriseRib(d.parametres.entreprise_rib ?? "");
          setEntrepriseCachet(d.parametres.entreprise_cachet ?? null);
        }
        return true;
      });
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  async function enregistrerParametres() {
    setEnvoi(true);
    try {
      const res = await fetch("/api/parametres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marge_minimum_pct: Number(margeMin),
          objectif_reserve: Number(objectifReserve),
          pct_reinvest: Number(pctReinvest),
          pct_reserve: Number(pctReserve),
          pct_parts: Number(pctParts),
          pct_frais: Number(pctFrais),
          entreprise_nom: entrepriseNom,
          entreprise_adresse: entrepriseAdresse,
          entreprise_tel: entrepriseTel,
          entreprise_rc: entrepriseRc,
          entreprise_nif: entrepriseNif,
          entreprise_nis: entrepriseNis,
          entreprise_art: entrepriseArt,
          entreprise_rib: entrepriseRib,
          entreprise_cachet: entrepriseCachet,
        }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'enregistrement.", "erreur");
        return;
      }
      afficher("Paramètres enregistrés — appliqués immédiatement à toute l'application.");
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function ajusterCaisse(confirmer: boolean) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/admin/caisse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nouveau_solde: Number(nouveauSolde),
          motif: motifAjustement.trim(),
          confirmer: confirmer || undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'ajustement.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setConfirmationAjustement(corps.message ?? "Confirmer l'ajustement ?");
        return;
      }
      afficher(`Solde ajusté à ${formaterDA(Number(nouveauSolde))} — mouvement tracé créé.`);
      setNouveauSolde("");
      setMotifAjustement("");
      setConfirmationAjustement(null);
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function deverrouiller(id: number) {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/admin/utilisateurs/${id}/deverrouillage`, { method: "POST" });
      const corps = (await res.json().catch(() => null)) as
        | { username?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du déverrouillage.", "erreur");
        return;
      }
      afficher(`Compte ${corps?.username} déverrouillé.`);
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function reinitialiser() {
    setEnvoi(true);
    try {
      const res = await fetch("/api/admin/reinitialisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: texteReset }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la réinitialisation.", "erreur");
        return;
      }
      afficher("Données métier réinitialisées — l'application repart à zéro.");
      setModalReset(false);
      setTexteReset("");
      await rafraichir();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  if (erreur && !donnees) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}
      </div>
    );
  }
  if (!donnees)
    return <p className="p-4 text-sm text-brand-warm-grey">Chargement de l'administration…</p>;

  const tuilesCompteurs = [
    { libelle: "Lots", valeur: donnees.compteurs.lots, icone: IconeCamion },
    { libelle: "Produits", valeur: donnees.compteurs.produits, icone: IconePaquet },
    { libelle: "Ventes valides", valeur: donnees.compteurs.ventes, icone: IconePanier },
    { libelle: "Ventes annulées", valeur: donnees.compteurs.ventes_annulees, icone: IconePanier },
    { libelle: "Mouvements de caisse", valeur: donnees.compteurs.mouvements, icone: IconeBanque },
    { libelle: "Réparations", valeur: donnees.compteurs.reparations, icone: IconeCle },
    { libelle: "Notifications", valeur: donnees.compteurs.notifications, icone: IconeCloche },
  ];

  return (
    <div className="space-y-6 animate-entree">
      <div className="pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Administration</h1>
        <p className="mt-1 text-sm text-brand-warm-grey">
          Pilotage des chiffres clés, des paramètres métier, des comptes et des données.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="libelle flex items-center gap-1.5 text-brand-smooth">
          <IconeHistorique taille={13} />
          Updates
        </h2>
        <div className="carte">
          <ul className="space-y-4">
            {MISES_A_JOUR.map((m, i) => {
              const d = new Date(m.date);
              return (
                <li
                  key={i}
                  className="flex gap-3 border-b border-brand-light-grey/30 pb-4 last:border-0 last:pb-0"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-glow/40 text-brand-orange">
                    <IconeHistorique taille={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-brand-black">{m.titre}</span>
                      <span className="font-mono text-xs text-brand-warm-grey">
                        {d.toLocaleDateString("fr-FR")} ·{" "}
                        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                    {m.details && m.details.length > 0 && (
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-brand-smooth">
                        {m.details.map((det, j) => (
                          <li key={j}>{det}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="libelle text-brand-smooth">Caisse — chiffres clés</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="carte">
            <p className="libelle flex items-center gap-1.5">
              <IconePortefeuille taille={13} />
              Solde total
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {formaterDA(donnees.soldes.total)}
            </p>
          </div>
          <div className="carte">
            <p className="libelle flex items-center gap-1.5">
              <IconeBanque taille={13} />
              Fonds de réserve
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {formaterDA(donnees.soldes.reserve)}
            </p>
          </div>
          <div className="carte">
            <p className="libelle flex items-center gap-1.5">
              <IconeBillet taille={13} />
              Disponible hors réserve
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {formaterDA(donnees.soldes.disponible)}
            </p>
          </div>
        </div>

        <div className="carte">
          <h3 className="libelle text-brand-smooth">Ajuster le solde total</h3>
          <p className="mt-1.5 text-xs text-brand-warm-grey">
            Saisissez le nouveau solde constaté : le système crée automatiquement le mouvement
            compensatoire tracé (rien n'est réécrit dans l'historique).
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="libelle mb-1.5" htmlFor="nouveau-solde">
                Nouveau solde total (DA)
              </label>
              <input
                id="nouveau-solde"
                type="number"
                min={0}
                step={1}
                value={nouveauSolde}
                onChange={(e) => setNouveauSolde(e.target.value)}
                placeholder={String(donnees.soldes.total)}
                className="champ w-44"
              />
            </div>
            <div className="min-w-56 flex-1">
              <label className="libelle mb-1.5" htmlFor="motif-ajustement">
                Motif (obligatoire)
              </label>
              <input
                id="motif-ajustement"
                type="text"
                value={motifAjustement}
                onChange={(e) => setMotifAjustement(e.target.value)}
                placeholder="Ex. Comptage physique de la caisse du 16/07"
                className="champ"
              />
            </div>
            <button
              type="button"
              disabled={envoi || !nouveauSolde.trim() || !motifAjustement.trim()}
              onClick={() => void ajusterCaisse(false)}
              className="btn btn-primaire"
            >
              Ajuster le solde
            </button>
          </div>
        </div>
      </section>

      <section className="carte">
        <h2 className="libelle flex items-center gap-1.5 text-brand-smooth">
          <IconeCurseurs taille={13} />
          Paramètres métier
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="libelle mb-1.5" htmlFor="marge-min">
              Marge minimum (%)
            </label>
            <input
              id="marge-min"
              type="number"
              min={0}
              max={100}
              step={1}
              value={margeMin}
              onChange={(e) => setMargeMin(e.target.value)}
              className="champ w-28"
            />
          </div>
          <div>
            <label className="libelle mb-1.5" htmlFor="objectif">
              Objectif de réserve (DA)
            </label>
            <input
              id="objectif"
              type="number"
              min={0}
              step={1}
              value={objectifReserve}
              onChange={(e) => setObjectifReserve(e.target.value)}
              className="champ w-44"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="libelle mb-1.5">Répartition mensuelle par défaut (%)</label>
          <div className="flex flex-wrap items-end gap-3 p-3 rounded bg-brand-light-grey/20 border border-brand-light-grey">
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Réinvestissement</label>
              <input
                type="number" min={0} max={100}
                value={pctReinvest}
                onChange={(e) => setPctReinvest(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Réserve</label>
              <input
                type="number" min={0} max={100}
                value={pctReserve}
                onChange={(e) => setPctReserve(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Parts associés</label>
              <input
                type="number" min={0} max={100}
                value={pctParts}
                onChange={(e) => setPctParts(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Frais divers</label>
              <input
                type="number" min={0} max={100}
                value={pctFrais}
                onChange={(e) => setPctFrais(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div className="ml-auto text-sm flex items-center gap-4">
              <div>
                Total : <strong className={Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) === 100 ? "text-succes" : "text-danger"}>
                  {Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais)}%
                </strong>
              </div>
              <button
                type="button"
                disabled={envoi || !margeMin.toString().trim() || !objectifReserve.toString().trim() || !pctReinvest.toString().trim() || !pctReserve.toString().trim() || !pctParts.toString().trim() || !pctFrais.toString().trim() || (Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) !== 100)}
                onClick={() => void enregistrerParametres()}
                className="btn btn-primaire"
              >
                <IconeEnregistrer taille={15} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-brand-light-grey/50">
          <h3 className="libelle mb-3">Profil de l'entreprise (Facturation)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Nom de l'entreprise</label>
              <input type="text" value={entrepriseNom} onChange={(e) => setEntrepriseNom(e.target.value)} className="champ" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Adresse</label>
              <input type="text" value={entrepriseAdresse} onChange={(e) => setEntrepriseAdresse(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Téléphone</label>
              <input type="text" value={entrepriseTel} onChange={(e) => setEntrepriseTel(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">N° RC</label>
              <input type="text" value={entrepriseRc} onChange={(e) => setEntrepriseRc(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">NIF</label>
              <input type="text" value={entrepriseNif} onChange={(e) => setEntrepriseNif(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">NIS</label>
              <input type="text" value={entrepriseNis} onChange={(e) => setEntrepriseNis(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">ART</label>
              <input type="text" value={entrepriseArt} onChange={(e) => setEntrepriseArt(e.target.value)} className="champ" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">RIB</label>
              <input type="text" value={entrepriseRib} onChange={(e) => setEntrepriseRib(e.target.value)} className="champ" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Cachet (Signature pour Factures)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    afficher("L'image ne doit pas dépasser 2Mo.", "erreur");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    setEntrepriseCachet(evt.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }}
                className="champ"
              />
              {entrepriseCachet && (
                <div className="mt-2 bg-brand-light-grey/20 p-2 rounded inline-block">
                  <img src={entrepriseCachet} alt="Cachet" className="h-16 w-auto object-contain" />
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={envoi}
              onClick={() => void enregistrerParametres()}
              className="btn btn-primaire"
            >
              <IconeEnregistrer taille={15} />
              Enregistrer
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-brand-warm-grey">
          La marge minimum déclenche la confirmation à la vente. L'objectif de réserve
          conditionne le versement des parts lors de la répartition mensuelle.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="libelle flex items-center gap-1.5 text-brand-smooth">
          <IconeBaseDeDonnees taille={13} />
          Données de l'application
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {tuilesCompteurs.map((t) => {
            const Icone = t.icone;
            return (
              <div key={t.libelle} className="carte p-4 text-center">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-glow/40 text-brand-orange">
                  <Icone taille={15} />
                </span>
                <p className="mt-2 text-xl font-bold">{t.valeur}</p>
                <p className="text-[11px] font-semibold text-brand-warm-grey">{t.libelle}</p>
              </div>
            );
          })}
        </div>
        {donnees.dernier_mouvement && (
          <p className="text-xs text-brand-warm-grey">
            Dernier mouvement de caisse :{" "}
            {new Date(donnees.dernier_mouvement.date).toLocaleString("fr-FR")} — solde{" "}
            {formaterDA(donnees.dernier_mouvement.solde_apres)}.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="libelle flex items-center gap-1.5 text-brand-smooth">
          <IconeUtilisateurs taille={13} />
          Comptes utilisateurs
        </h2>
        <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-brand-light-grey/25">
              <tr>
                <th className="entete-table">Identifiant</th>
                <th className="entete-table">Rôle</th>
                <th className="entete-table text-right">Tentatives échouées</th>
                <th className="entete-table">Statut</th>
                <th className="entete-table" />
              </tr>
            </thead>
            <tbody className="">
              {donnees.utilisateurs.map((u) => (
                <tr key={u.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
                  <td className="px-3 py-2.5 font-semibold">{u.username}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-brand-light-grey/50 px-2.5 py-0.5 text-xs font-semibold text-brand-smooth">
                      {LIBELLES_ROLE[u.role]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{u.login_attempts}</td>
                  <td className="px-3 py-2.5">
                    {u.verrouille ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
                        Verrouillé
                        {u.locked_until &&
                          ` jusqu'à ${new Date(u.locked_until).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-succes/10 px-2.5 py-0.5 text-xs font-semibold text-succes">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {(u.verrouille || u.login_attempts > 0) && (
                      <button
                        type="button"
                        disabled={envoi}
                        onClick={() => void deverrouiller(u.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-crystal hover:underline"
                      >
                        <IconeCadenasOuvert taille={13} />
                        Déverrouiller
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-danger/25 bg-danger/5 p-5">
        <h2 className="libelle flex items-center gap-1.5 text-danger">
          <IconeBouclier taille={13} />
          Zone dangereuse
        </h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-brand-smooth">
            Réinitialiser les données métier : vide lots, produits, ventes, réparations,
            mouvements de caisse et notifications. Les comptes et les paramètres sont conservés.
            Action irréversible.
          </p>
          <button type="button" onClick={() => setModalReset(true)} className="btn btn-danger">
            <IconeCorbeille taille={15} />
            Réinitialiser les données
          </button>
        </div>
      </section>

      <Modale
        titre="Confirmer l'ajustement de caisse"
        ouverte={confirmationAjustement !== null}
        onFermer={() => setConfirmationAjustement(null)}
      >
        <p className="flex items-start gap-2 text-sm text-brand-smooth">
          <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
          {confirmationAjustement}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmationAjustement(null)}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi}
            onClick={() => void ajusterCaisse(true)}
            className="btn btn-primaire"
          >
            Confirmer l'ajustement
          </button>
        </div>
      </Modale>

      <Modale
        titre="Réinitialiser les données métier"
        ouverte={modalReset}
        onFermer={() => {
          setModalReset(false);
          setTexteReset("");
        }}
      >
        <p className="text-sm text-brand-smooth">
          Toutes les données métier (lots, produits, ventes, réparations, mouvements de caisse,
          notifications) seront définitivement supprimées. Les 4 comptes et les paramètres sont
          conservés.
        </p>
        <p className="mt-3 text-sm text-brand-warm-grey">
          Pour confirmer, saisissez <strong className="text-danger">REINITIALISER</strong> :
        </p>
        <input
          type="text"
          value={texteReset}
          onChange={(e) => setTexteReset(e.target.value)}
          autoFocus
          className="champ mt-2"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setModalReset(false);
              setTexteReset("");
            }}
            className="btn btn-secondaire"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={envoi || texteReset !== "REINITIALISER"}
            onClick={() => void reinitialiser()}
            className="btn btn-danger"
          >
            <IconeCorbeille taille={15} />
            Tout réinitialiser
          </button>
        </div>
      </Modale>
    </div>
  );
}
