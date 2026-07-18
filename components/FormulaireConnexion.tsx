"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SelecteurLangue from "@/components/SelecteurLangue";
import { useT } from "@/lib/i18n/contexte";

function destinationSure(brut: string | null): string {
  if (brut && brut.startsWith("/") && !brut.startsWith("//")) return brut;
  return "/";
}

export default function FormulaireConnexion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const reponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as { error?: string } | null;
        setErreur(corps?.error ?? t("connexion.erreurDefaut"));
        return;
      }
      router.push(destinationSure(searchParams?.get("suivant") ?? null));
      router.refresh();
    } catch {
      setErreur(t("connexion.serveurInjoignable"));
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-smooth p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <SelecteurLangue sombre />
        </div>
        <div className="mb-7 flex flex-col items-center gap-4">
          <img
            src="/brand/solutionmaxi-logo-fonce.svg"
            alt="SolutionMaxi"
            className="h-9 w-auto"
          />
          <p className="text-sm text-brand-grey">{t("connexion.sousTitre")}</p>
        </div>

        <form onSubmit={soumettre} className="space-y-4 rounded-2xl bg-brand-white p-6 shadow-2xl">
          <div>
            <label htmlFor="username" className="libelle mb-1.5">
              {t("connexion.identifiant")}
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="champ"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="libelle mb-1.5">
              {t("connexion.motDePasse")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="champ"
              required
            />
          </div>

          {erreur && (
            <p role="alert" className="alerte-erreur">
              {erreur}
            </p>
          )}

          <button type="submit" disabled={chargement || !username.trim() || !password.trim()} className="btn btn-primaire w-full">
            {chargement ? t("connexion.connexionEnCours") : t("connexion.seConnecter")}
          </button>
        </form>
      </div>
    </main>
  );
}
