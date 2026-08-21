"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme-maxy") as Theme | null;
    if (stored) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Fonction utilitaire pour appliquer le thème avec la transition fluide (View Transitions API)
  const applyTheme = (newTheme: "light" | "dark") => {
    const root = window.document.documentElement;
    
    const execThemeChange = () => {
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
      root.setAttribute("data-theme", newTheme);
      setResolvedTheme(newTheme);
    };

    // Utilisation de l'API View Transitions si disponible (pour un fondu GPU à 120 FPS)
    if (!("startViewTransition" in document)) {
      execThemeChange();
      return;
    }

    // @ts-ignore : L'API n'est pas forcément typée dans ce TS config
    document.startViewTransition(() => {
      execThemeChange();
    });
  };

  useEffect(() => {
    if (!mounted) return;

    let actualTheme: "light" | "dark";
    if (theme === "system") {
      actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      actualTheme = theme;
    }

    applyTheme(actualTheme);
    localStorage.setItem("theme-maxy", theme);
  }, [theme, mounted]);

  // Écoute des changements système
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        const newTheme = e.matches ? "dark" : "light";
        applyTheme(newTheme);
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme doit être utilisé dans un ThemeProvider");
  }
  return context;
}
