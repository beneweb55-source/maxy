"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import ClocheNotifications from "./ClocheNotifications";
import SelecteurLangue from "./SelecteurLangue";
import ThemeToggle from "./ThemeToggle";
import { FournisseurToasts } from "./toast";
import ScannerGlobal from "./ScannerGlobal";
import { useT } from "@/lib/i18n/contexte";
import {
  IconeArchive,
  IconeBillet,
  IconeCamion,
  IconeDeconnexion,
  IconeFermer,
  IconeMenu,
  IconePanier,
  IconePortefeuille,
  IconeRapport,
  IconeReglages,
  IconeTableauDeBord,
  IconeVitrine,
  type ProprietesIcone,
} from "./icons";

interface UtilisateurShell {
  id: number;
  username: string;
  role: Role;
}

interface EntreeNavigation {
  href: string;
  cle: string;
  icone: (props: ProprietesIcone) => React.ReactNode;
  sousChemins: readonly string[];
  roles?: readonly Role[];
}

const NAVIGATION: readonly EntreeNavigation[] = [
  { href: "/", cle: "nav.dashboard", icone: IconeTableauDeBord, sousChemins: [] },
  {
    href: "/arrivages",
    cle: "nav.arrivages",
    icone: IconeCamion,
    sousChemins: ["/lots"],
    roles: ["gerant", "technicien", "dev"],
  },
  { href: "/inventaire", cle: "nav.inventaire", icone: IconeArchive, sousChemins: ["/produits"] },
  { href: "/vitrine", cle: "nav.vitrine", icone: IconeVitrine, sousChemins: [] },
  {
    href: "/rapports",
    cle: "nav.rapports",
    icone: IconeRapport,
    sousChemins: [],
    roles: ["gerant", "technicien", "dev"],
  },
  { href: "/factures", cle: "nav.factures", icone: IconeBillet, sousChemins: [] },
  {
    href: "/caisse",
    cle: "nav.caisse",
    icone: IconePortefeuille,
    sousChemins: [],
  },
  {
    href: "/administration",
    cle: "nav.administration",
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
  const t = useT();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const pointerId = useRef<number | null>(null);
  
  const SIDEBAR_WIDTH = 256;
  
  const isNavigating = useRef(false);

  // Interception de l'historique pour fermer le menu avec le bouton Retour
  useEffect(() => {
    if (!menuOuvert) return;
    window.history.pushState({ menuOpen: true }, "");
    const handlePopState = () => setMenuOuvert(false);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!isNavigating.current && window.history.state?.menuOpen) {
        window.history.back();
      }
      isNavigating.current = false;
    };
  }, [menuOuvert]);

  const onDragStart = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" && e.pointerType !== "mouse") return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    pointerId.current = e.pointerId;
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    if (!isDragging) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        setIsDragging(true);
        (e.target as Element).setPointerCapture(e.pointerId);
      } else if (Math.abs(deltaY) > 10) {
        pointerId.current = null; // C'est un scroll vertical
        return;
      } else {
        return; // Mouvement pas encore suffisant
      }
    }

    if (menuOuvert) {
      setDragOffset(Math.min(0, Math.max(-SIDEBAR_WIDTH, deltaX)));
    } else {
      setDragOffset(Math.min(0, Math.max(-SIDEBAR_WIDTH, -SIDEBAR_WIDTH + deltaX)));
    }
  };

  const onDragEnd = (e: React.PointerEvent) => {
    pointerId.current = null;
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
    if (menuOuvert) {
      if (dragOffset < -SIDEBAR_WIDTH / 4) setMenuOuvert(false);
    } else {
      if (dragOffset > -SIDEBAR_WIDTH * 0.75) setMenuOuvert(true);
    }
    setDragOffset(0);
  };

  const onDragCancel = (e: React.PointerEvent) => {
    pointerId.current = null;
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragOffset(0);
  };

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
        <p className="libelle px-4 pb-3 text-brand-grey/60">{t("nav.navigation")}</p>
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
              onClick={() => {
                isNavigating.current = true;
                setMenuOuvert(false);
              }}
              aria-current={actif ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                actif
                  ? "bg-gradient-to-r from-brand-orange to-[#EA580C] text-white shadow-md shadow-brand-orange/20 translate-x-1"
                  : "text-brand-grey hover:bg-white/5 hover:text-white hover:translate-x-1"
              }`}
            >
              <Icone taille={18} className={actif ? "opacity-100" : "opacity-70"} />
              {t(item.cle)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 backdrop-blur-sm border border-white/5 transition-colors hover:bg-white/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-[#EA580C] shadow-sm text-sm font-bold uppercase text-white">
            {user.username.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-white">
              {user.username}
            </span>
            <span className="block text-xs text-brand-grey">{t(`roles.${user.role}`)}</span>
          </span>
          <button
            type="button"
            onClick={() => void deconnexion()}
            title={t("entete.deconnexion")}
            aria-label={t("entete.deconnexion")}
            className="rounded-lg p-2 text-brand-grey transition hover:bg-white/10 hover:text-white"
          >
            <IconeDeconnexion taille={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <FournisseurToasts>
      <ScannerGlobal />
      <div className="min-h-screen print:bg-white font-inter text-brand-black transition-colors duration-300 ease-in-out">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-[var(--color-sidebar-bg)] shadow-2xl shadow-black/10 lg:block print:hidden transition-colors duration-300 ease-in-out">
          {contenuSidebar}
        </aside>

        {/* Edge Receiver pour ouvrir le menu par Swipe depuis le bord gauche */}
        {!menuOuvert && !isDragging && (
          <div
            className="fixed inset-y-0 left-0 z-40 w-5 lg:hidden touch-pan-y"
            onPointerDown={onDragStart}
          />
        )}

        {/* Overlay & Sidebar Mobile */}
        <div
          className={`fixed inset-0 z-50 lg:hidden print:hidden ${
            menuOuvert || isDragging ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
              menuOuvert && !isDragging ? "opacity-100" : isDragging ? "opacity-50" : "opacity-0"
            }`}
            style={{ opacity: isDragging ? Math.min((SIDEBAR_WIDTH + dragOffset) / SIDEBAR_WIDTH, 1) : undefined }}
            onClick={() => setMenuOuvert(false)}
          />

          {/* Sidebar */}
          <div
            className="absolute left-0 top-0 h-full w-64 bg-[var(--color-sidebar-bg)] shadow-2xl touch-pan-y"
            style={{
              transform: isDragging
                ? `translateX(${dragOffset}px)`
                : menuOuvert
                ? "translateX(0)"
                : "translateX(-100%)",
              transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onPointerDown={menuOuvert ? onDragStart : undefined}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragCancel}
          >
            <button
              type="button"
              onClick={() => setMenuOuvert(false)}
              aria-label={t("entete.fermerMenu")}
              className="absolute right-3 top-5 rounded-lg p-2 text-brand-grey hover:text-white z-50"
            >
              <IconeFermer taille={18} />
            </button>
            {contenuSidebar}
          </div>
        </div>

        <div className="lg:pl-64 transition-all duration-300 ease-in-out">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-brand-light-grey/60 bg-brand-white/80 px-4 backdrop-blur-xl lg:px-8 print:hidden">
            <button
              type="button"
              onClick={() => setMenuOuvert(true)}
              className="rounded-lg border border-brand-light-grey p-2 text-brand-smooth lg:hidden"
              aria-label={t("entete.ouvrirMenu")}
            >
              <IconeMenu taille={18} />
            </button>
            <span className="hidden text-sm font-semibold text-brand-smooth lg:block font-outfit tracking-wide">
              {t("entete.titrePlateforme")}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <SelecteurLangue />
              <ClocheNotifications />
            </div>
          </header>

          <main className="min-w-0 p-4 lg:p-8 print:p-0">{children}</main>
        </div>
      </div>
    </FournisseurToasts>
  );
}
