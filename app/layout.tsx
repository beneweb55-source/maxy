import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LangueProvider } from "@/lib/i18n/contexte";
import { estLangue, type Langue } from "@/lib/i18n/types";

export const metadata: Metadata = {
  title: "SolutionMaxi",
  description: "Plateforme de gestion de Stock / Revente Solution Maxi",
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
    <html lang={langue}>
      <body className="min-h-screen bg-brand-white text-brand-black antialiased">
        <LangueProvider langueInitiale={langue}>{children}</LangueProvider>
      </body>
    </html>
  );
}
