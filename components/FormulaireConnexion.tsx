"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/contexte";
import { IconeOeil, IconeOeilBarre } from "@/components/icons";

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
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ username: username.trim(), password }),
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
    <main className="flex min-h-[100dvh] w-full max-w-full overflow-x-hidden items-center justify-center bg-brand-paper p-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-4">
          <img
            src="/brand/solutionmaxi-logo-fonce.svg"
            alt="SolutionMaxi"
            className="h-9 w-auto dark:hidden"
          />
          <img
            src="/brand/solutionmaxi-logo-clair.svg"
            alt="SolutionMaxi"
            className="h-9 w-auto hidden dark:block"
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="champ pr-12"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-brand-warm-grey hover:text-brand-black focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <IconeOeilBarre taille={18} /> : <IconeOeil taille={18} />}
              </button>
            </div>
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
