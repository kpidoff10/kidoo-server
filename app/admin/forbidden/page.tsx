import Link from 'next/link';

export default function AdminForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Accès refusé
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Votre compte n&apos;a pas les droits administrateur pour accéder à cette zone.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/admin/login"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Changer de compte
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
