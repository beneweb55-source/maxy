"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import ClocheNotifications from "./ClocheNotifications";
import { FournisseurToasts } from "./toast";
import {
  IconeArchive,
  IconeCamion,
  IconeDeconnexion,
  IconeFermer,
  IconeMenu,
  IconePanier,
  IconePortefeuille,
  IconeRapport,
  IconeReglages,
  IconeTableauDeBord,
  type ProprietesIcone,
} from "./icons";

interface UtilisateurShell {
  id: number;
  username: string;
  role: Role;
}

const LIBELLES_ROLE: Record<Role, string> = {
  gerant: "Gérant",
  technicien: "Technicien",
  dev: "Dev",
};

interface EntreeNavigation {
  href: string;
  libelle: string;
  icone: (props: ProprietesIcone) => React.ReactNode;
  sousChemins: readonly string[];
  roles?: readonly Role[];
}

const NAVIGATION: readonly EntreeNavigation[] = [
  { href: "/", libelle: "Dashboard", icone: IconeTableauDeBord, sousChemins: [] },
  { href: "/arrivages", libelle: "Arrivages", icone: IconeCamion, sousChemins: ["/lots"] },
  { href: "/inventaire", libelle: "Inventaire", icone: IconeArchive, sousChemins: ["/produits"] },
  { href: "/rapports", libelle: "Rapports", icone: IconeRapport, sousChemins: [] },
  { href: "/ventes", libelle: "Ventes", icone: IconePanier, sousChemins: [] },
  {
    href: "/caisse",
    libelle: "Caisse",
    icone: IconePortefeuille,
    sousChemins: [],
    roles: ["gerant", "dev"],
  },
  {
    href: "/administration",
    libelle: "Administration",
    icone: IconeReglages,
    sousChemins: [],
    roles: ["gerant"],
  },
];

export default function AppShell({
  user,
  children,
}: {
  user: UtilisateurShell;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const navigation = NAVIGATION.filter((item) => !item.roles || item.roles.includes(user.role));

  async function deconnexion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }

  const contenuSidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-7 pt-7">
        <img
          src="/brand/solutionmaxi-logo-fonce.svg"
          alt="SolutionMaxi"
          className="h-7 w-auto"
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="libelle px-3 pb-2 text-brand-grey/70">Navigation</p>
        {navigation.map((item) => {
          const actif =
            item.href === "/"
              ? pathname === "/"
              : (pathname?.startsWith(item.href) ||
                item.sousChemins.some((prefixe) => pathname?.startsWith(prefixe)));
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOuvert(false)}
              aria-current={actif ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                actif
                  ? "bg-brand-orange text-brand-white"
                  : "text-brand-grey hover:bg-white/5 hover:text-brand-white"
              }`}
            >
              <Icone taille={17} />
              {item.libelle}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold uppercase text-brand-white">
            {user.username.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-brand-white">
              {user.username}
            </span>
            <span className="block text-xs text-brand-grey">{LIBELLES_ROLE[user.role]}</span>
          </span>
          <button
            type="button"
            onClick={() => void deconnexion()}
            title="Déconnexion"
            aria-label="Déconnexion"
            className="rounded-lg p-2 text-brand-grey transition hover:bg-white/10 hover:text-brand-white"
          >
            <IconeDeconnexion taille={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <FournisseurToasts>
      <div className="min-h-screen print:bg-white">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-brand-smooth lg:block print:hidden">
          {contenuSidebar}
        </aside>

        {menuOuvert && (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden">
            <div className="absolute inset-0 bg-brand-black/50" onClick={() => setMenuOuvert(false)} />
            <div className="absolute left-0 top-0 h-full w-64 bg-brand-smooth shadow-2xl">
              <button
                type="button"
                onClick={() => setMenuOuvert(false)}
                aria-label="Fermer le menu"
                className="absolute right-3 top-5 rounded-lg p-2 text-brand-grey hover:text-brand-white"
              >
                <IconeFermer taille={18} />
              </button>
              {contenuSidebar}
            </div>
          </div>
        )}

        <div className="lg:pl-60">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-brand-light-grey bg-brand-white/90 px-4 backdrop-blur lg:px-6 print:hidden">
            <button
              type="button"
              onClick={() => setMenuOuvert(true)}
              className="rounded-lg border border-brand-light-grey p-2 text-brand-smooth lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <IconeMenu taille={18} />
            </button>
            <span className="hidden text-sm font-medium text-brand-warm-grey lg:block">
              Plateforme de gestion de Stock / Revente Solution Maxy
            </span>
            <ClocheNotifications />
          </header>

          <main className="min-w-0 p-4 lg:p-6 print:p-0">{children}</main>
        </div>
      </div>
    </FournisseurToasts>
  );
}
