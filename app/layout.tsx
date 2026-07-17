import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolutionMaxi",
  description: "Plateforme de gestion de Stock / Revente Solution Maxy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-brand-white text-brand-black antialiased">
        {children}
      </body>
    </html>
  );
}
