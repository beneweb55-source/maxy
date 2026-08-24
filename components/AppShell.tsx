"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import ClocheNotifications from "./ClocheNotifications";
import SelecteurLangue from "./SelecteurLangue";
import ThemeToggle from "./ThemeToggle";
import IndicateurConnexion from "./IndicateurConnexion";
import dynamic from "next/dynamic";
import { FournisseurToasts, useToast } from "./toast";
import ScannerGlobal from "./ScannerGlobal";
import { useT } from "@/lib/i18n/contexte";
import { useSwipeMenu } from "@/hooks/useSwipeMenu";
import { useCapacitorHardwareBack } from "@/hooks/useCapacitorHardwareBack";
import { useLayer, LAYER_PRIORITY } from "@/hooks/useLayerStack";
import { useSuiviNavigation } from "@/hooks/useHistoriqueNavigation";
import { useRaccourcis } from "@/hooks/useRaccourcis";
import RechercheGlobale from "./RechercheGlobale";
import Modale from "./Modale";
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
  IconeRecherche,
  type ProprietesIcone,
} from "./icons";

const CapacitorPushManager = dynamic(() => import("./CapacitorPushManager"), { ssr: false });

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
    href: "/carnet",
    cle: "nav.carnet",
    icone: IconeArchive, // fallback icon since it looks a bit like a book/notebook
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

/**
 * Sous-composant sous le FournisseurToasts pour orchestrer
 * le suivi de navigation et le bouton retour matériel Capacitor.
 */
function GestionnaireRetourShell() {
  const { afficher } = useToast();
  useSuiviNavigation();
  useCapacitorHardwareBack((msg) => afficher(msg, "succes"));
  return null;
}

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
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [guideOuvert, setGuideOuvert] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const SIDEBAR_WIDTH = 256;

  // Hook global pour le swipe natif (60/120fps)
  useSwipeMenu({
    menuOuvert,
    setMenuOuvert,
    sidebarRef,
    overlayRef,
    sidebarWidth: SIDEBAR_WIDTH
  });

  // Enregistrement du menu dans la pile de couches avec priorité MENU
  useLayer("app-menu", menuOuvert, () => setMenuOuvert(false), LAYER_PRIORITY.MENU);

  useRaccourcis({
    role: user.role,
    onOuvrirRecherche: () => setRechercheOuverte(true),
    onOuvrirGuide: () => setGuideOuvert(true),
  });

  const navigation = NAVIGATION.filter((item) => !item.roles || item.roles.includes(user.role));

  async function deconnexion() {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/notifications/push/unsubscribe", {
            method: "POST",
            body: JSON.stringify(sub),
            headers: { "Content-Type": "application/json" },
          });
          await sub.unsubscribe();
        }
      }
    } catch (e) {
      console.error("Erreur désabonnement push:", e);
    }
    try {
      await fetch("/api/notifications/fcm/unsubscribe", { method: "POST" });
    } catch (e) {
      console.error("Erreur désabonnement fcm:", e);
    }
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 touch-pan-y">
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
        <GestionnaireRetourShell />
        <ScannerGlobal />
        <div className="min-h-screen bg-brand-paper font-inter text-brand-black">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-[var(--color-sidebar-bg)] shadow-2xl shadow-black/10 lg:block print:hidden">
          {contenuSidebar}
        </aside>

        {/* Overlay & Sidebar Mobile */}
        <div
          className={`fixed inset-0 z-50 lg:hidden print:hidden ${
            menuOuvert ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Overlay */}
          <div
            ref={overlayRef}
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
              menuOuvert ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMenuOuvert(false)}
          />

          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className={`absolute left-0 top-0 h-full w-64 bg-[var(--color-sidebar-bg)] shadow-2xl transition-transform duration-300 cubic-bezier-out ${
              menuOuvert ? "translate-x-0" : "-translate-x-full"
            }`}
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

        <div className="lg:pl-64">
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
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setRechercheOuverte(true)}
                className="hidden lg:flex items-center gap-2 rounded-lg border border-brand-light-grey px-3 py-1.5 text-sm text-brand-warm-grey transition hover:bg-brand-light-grey/40"
                aria-label={t("rechercheGlobale.placeholder") || "Rechercher..."}
              >
                <IconeRecherche taille={16} />
                <span className="hidden xl:inline-block">Rechercher...</span>
                <kbd className="ml-2 rounded border border-brand-light-grey bg-brand-paper px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
              </button>
              <button
                type="button"
                onClick={() => setRechercheOuverte(true)}
                className="lg:hidden rounded-lg border border-brand-light-grey p-2 text-brand-smooth transition hover:bg-brand-light-grey/40"
                aria-label={t("rechercheGlobale.placeholder") || "Rechercher..."}
              >
                <IconeRecherche taille={18} />
              </button>
              <IndicateurConnexion />
              <ThemeToggle />
              <SelecteurLangue />
              <ClocheNotifications />
            </div>
          </header>

          <main className="min-w-0 p-4 lg:p-8 print:p-0">{children}</main>
        </div>
      </div>
      <RechercheGlobale
        role={user.role}
        ouverte={rechercheOuverte}
        onFermer={() => setRechercheOuverte(false)}
      />
      <Modale
        titre="Guide des raccourcis clavier"
        ouverte={guideOuvert}
        onFermer={() => setGuideOuvert(false)}
      >
        <div className="space-y-4 text-sm text-brand-smooth mt-2">
          <div className="flex justify-between items-center border-b border-brand-light-grey/50 pb-2">
            <span>Recherche globale</span>
            <kbd className="rounded border border-brand-light-grey bg-brand-light-grey/20 px-2 py-1 font-mono font-bold">Ctrl + K</kbd>
          </div>
          <div className="flex justify-between items-center border-b border-brand-light-grey/50 pb-2">
            <span>Aller à l'inventaire</span>
            <kbd className="rounded border border-brand-light-grey bg-brand-light-grey/20 px-2 py-1 font-mono font-bold">Ctrl + I</kbd>
          </div>
          <div className="flex justify-between items-center border-b border-brand-light-grey/50 pb-2">
            <span>Nouveau lot (Gérant)</span>
            <kbd className="rounded border border-brand-light-grey bg-brand-light-grey/20 px-2 py-1 font-mono font-bold">Ctrl + N</kbd>
          </div>
          <div className="flex justify-between items-center border-b border-brand-light-grey/50 pb-2">
            <span>Fermer / Retour en arrière</span>
            <kbd className="rounded border border-brand-light-grey bg-brand-light-grey/20 px-2 py-1 font-mono font-bold">Échap</kbd>
          </div>
          <div className="flex justify-between items-center pb-2">
            <span>Afficher ce guide</span>
            <kbd className="rounded border border-brand-light-grey bg-brand-light-grey/20 px-2 py-1 font-mono font-bold">Ctrl + H</kbd>
          </div>
        </div>
      </Modale>
      <CapacitorPushManager />
    </FournisseurToasts>
  );
}
