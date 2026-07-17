import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1>Page introuvable</h1>
        <p className="mt-2 text-sm text-brand-warm-grey">
          La page demandée n'existe pas.
        </p>
        <Link href="/" className="btn btn-primaire mt-5">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
