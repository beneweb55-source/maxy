"use client";

import { useTheme } from "./ThemeProvider";
import { IconeLune, IconeSoleil } from "./icons";
import { useT } from "@/lib/i18n/contexte";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const t = useT();

  // Affichage factice en attendant le montage (hydrate)
  if (!mounted) {
    return (
      <div className="relative inline-flex h-9 w-16 items-center rounded-full bg-brand-light-grey/50 p-1 opacity-50">
        <div className="h-7 w-7 rounded-full bg-brand-white shadow-sm" />
      </div>
    );
  }

  const estSombre = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(estSombre ? "light" : "dark")}
      className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-opacity-[var(--ring-opacity)] ${
        estSombre ? "bg-brand-smooth" : "bg-brand-light-grey"
      }`}
      aria-label={estSombre ? t("theme.activerClair") : t("theme.activerSombre")}
      title={t("theme.basculer")}
    >
      <span
        className={`pointer-events-none relative flex h-7 w-7 transform items-center justify-center rounded-full bg-brand-white shadow-md ring-0 transition duration-150 ease-in-out ${
          estSombre ? "translate-x-7" : "translate-x-0"
        }`}
      >
        <IconeSoleil
          taille={15}
          className={`absolute text-brand-orange transition-all duration-150 ease-in-out ${
            estSombre ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <IconeLune
          taille={14}
          className={`absolute text-brand-crystal transition-all duration-150 ease-in-out ${
            estSombre ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
