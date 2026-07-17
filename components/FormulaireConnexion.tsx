"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function destinationSure(brut: string | null): string {
  if (brut && brut.startsWith("/") && !brut.startsWith("//")) return brut;
  return "/";
}

export default function FormulaireConnexion() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        setErreur(corps?.error ?? "Erreur de connexion. Réessayez.");
        return;
      }
      router.push(destinationSure(searchParams?.get("suivant") ?? null));
      router.refresh();
    } catch {
      setErreur("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-smooth p-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-4">
          <img
            src="/brand/solutionmaxi-logo-fonce.svg"
            alt="SolutionMaxi"
            className="h-9 w-auto"
          />
          <p className="text-sm text-brand-grey">
            Plateforme de gestion de Stock / Revente Solution Maxy
          </p>
        </div>

        <form onSubmit={soumettre} className="space-y-4 rounded-2xl bg-brand-white p-6 shadow-2xl">
          <div>
            <label htmlFor="username" className="libelle mb-1.5">
              Identifiant
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
              Mot de passe
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
            {chargement ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
