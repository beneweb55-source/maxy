"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { useT } from "@/lib/i18n/contexte";
import {
  IconeTableauDeBord,
  IconeArchive,
  IconeCamion,
  IconePortefeuille,
  IconePanier,
  IconeMenu,
} from "./icons";

interface BottomNavProps {
  role: Role;
  onOuvrirMenu: () => void;
  menuOuvert: boolean;
}

export default function BottomNav({ role, onOuvrirMenu, menuOuvert }: BottomNavProps) {
  const pathname = usePathname();
  const t = useT();

  const estArrivageAccessible = ["gerant", "technicien", "dev"].includes(role);

  // 4 raccourcis clés + 1 bouton Menu
  const raccourcis = [
    {
      href: "/",
      cle: "nav.dashboard",
      icone: IconeTableauDeBord,
      actif: pathname === "/",
    },
    {
      href: "/inventaire",
      cle: "nav.inventaire",
      icone: IconeArchive,
      actif: pathname?.startsWith("/inventaire") || pathname?.startsWith("/produits"),
    },
    estArrivageAccessible
      ? {
          href: "/arrivages",
          cle: "nav.arrivages",
          icone: IconeCamion,
          actif: pathname?.startsWith("/arrivages") || pathname?.startsWith("/lots"),
        }
      : {
          href: "/commandes",
          cle: "nav.ventes",
          icone: IconePanier,
          actif: pathname?.startsWith("/commandes"),
        },
    {
      href: "/caisse",
      cle: "nav.caisse",
      icone: IconePortefeuille,
      actif: pathname?.startsWith("/caisse"),
    },
  ];

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden print:hidden border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-2xl safe-bottom"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-1.5 pb-1">
        {raccourcis.map((item) => {
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.actif ? "page" : undefined}
              className={`flex flex-col items-center justify-center rounded-2xl py-1 px-2.5 transition-all duration-150 active-scale ${
                item.actif
                  ? "text-brand-orange"
                  : "text-brand-warm-grey dark:text-zinc-400 hover:text-brand-black dark:hover:text-white"
              }`}
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                  item.actif
                    ? "bg-brand-orange/15 dark:bg-brand-orange/25 text-brand-orange scale-105"
                    : "bg-transparent"
                }`}
              >
                <Icone taille={20} className={item.actif ? "stroke-[2.5]" : "stroke-[1.8]"} />
              </div>
              <span
                className={`mt-0.5 text-[10px] font-bold tracking-tight text-center leading-none ${
                  item.actif ? "text-brand-orange font-black" : "text-brand-warm-grey dark:text-zinc-400"
                }`}
              >
                {t(item.cle)}
              </span>
            </Link>
          );
        })}

        {/* Bouton pour ouvrir tout le menu latéral */}
        <button
          type="button"
          onClick={onOuvrirMenu}
          aria-label={t("entete.ouvrirMenu")}
          className={`flex flex-col items-center justify-center rounded-2xl py-1 px-2.5 transition-all duration-150 active-scale ${
            menuOuvert
              ? "text-brand-orange"
              : "text-brand-warm-grey dark:text-zinc-400 hover:text-brand-black dark:hover:text-white"
          }`}
        >
          <div
            className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
              menuOuvert
                ? "bg-brand-orange/15 dark:bg-brand-orange/25 text-brand-orange"
                : "bg-transparent"
            }`}
          >
            <IconeMenu taille={20} className="stroke-[1.8]" />
          </div>
          <span className="mt-0.5 text-[10px] font-bold tracking-tight text-center leading-none">
            {t("nav.navigation") || "Menu"}
          </span>
        </button>
      </div>
    </nav>
  );
}
