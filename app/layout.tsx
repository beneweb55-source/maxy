import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LangueProvider } from "@/lib/i18n/contexte";
import { estLangue, type Langue } from "@/lib/i18n/types";
import { ThemeProvider } from "@/components/ThemeProvider";

const scriptTheme = `
  (function() {
    try {
      var localTheme = window.localStorage.getItem('theme-maxy');
      var theme = localTheme || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
`;

export const metadata: Metadata = {
  title: "SolutionMaxi",
  description: "Plateforme de gestion de Stock / Revente Solution Maxi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SolutionMaxi",
  },
};

export const viewport: Viewport = { 
  width: "device-width", 
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Langue lue depuis le cookie (synchronisé avec la préférence en base au
  // login) : le rendu serveur part directement dans la bonne langue.
  const brut = (await cookies()).get("langue")?.value;
  const langue: Langue = estLangue(brut) ? brut : "fr";
  return (
    <html lang={langue} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
        <link rel="apple-touch-icon" href="/brand/solutionmaxi-icone.svg" />
      </head>
      <body className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-brand-paper text-brand-black antialiased">
        <LangueProvider langueInitiale={langue}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LangueProvider>
      </body>
    </html>
  );
}
