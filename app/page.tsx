import Link from "next/link";
import { ProductCard } from "./components/ProductCard";
import { products } from "@/lib/products";

export default function Home() {
  const availableProducts = products.filter((p) => p.status === "available");
  const comingSoonProducts = products.filter((p) => p.status === "coming-soon");

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 backdrop-blur dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-lg"></div>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
                Kidoo
              </span>
            </Link>
            <nav className="hidden gap-8 md:flex">
              <Link href="#products" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                Produits
              </Link>
              <Link href="#features" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                Fonctionnalités
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
            ✨ Une collection de produits connectés pour les enfants
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-7xl">
            L&apos;univers Kidoo
            <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 bg-clip-text text-transparent">
              pour des nuits et des matins apaisants
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Découvrez notre collection de veilleuses et lampes intelligentes conçues pour accompagner les enfants dans leurs routines quotidiennes.
            Technologie et douceur combinées pour le bien-être de toute la famille.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="#products"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:from-purple-700 hover:to-pink-700"
            >
              Explorer les produits
            </Link>
            <Link
              href="#features"
              className="rounded-xl border border-zinc-300 px-8 py-3 font-semibold text-zinc-900 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Voir les fonctionnalités
            </Link>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">Nos Produits</h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Chaque produit Kidoo est conçu avec soin pour offrir une expérience unique
          </p>
        </div>

        {/* Available Products */}
        <div className="grid gap-8 lg:grid-cols-1">
          {availableProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Coming Soon Products */}
        {comingSoonProducts.length > 0 && (
          <div className="mt-20 pt-20">
            <h3 className="mb-12 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Bientôt disponible 🎉
            </h3>
            <div className="grid gap-8 lg:grid-cols-1">
              {comingSoonProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Pourquoi choisir Kidoo ?
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Des fonctionnalités pensées pour simplifier votre vie
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🎯",
              title: "Personnalisable",
              description:
                "Adaptez chaque paramètre à vos besoins : horaires, couleurs, luminosité, effets spéciaux.",
            },
            {
              icon: "📱",
              title: "Contrôle facile",
              description:
                "Gérez vos appareils depuis votre smartphone via l'application mobile dédiée.",
            },
            {
              icon: "🔄",
              title: "Routines automatiques",
              description:
                "Les appareils activent automatiquement leurs routines selon les horaires programmés.",
            },
            {
              icon: "🌍",
              title: "Compatible multiplateforme",
              description:
                "Fonctionne sur iOS et Android avec une synchronisation instantanée.",
            },
            {
              icon: "⚡",
              title: "Efficace énergétiquement",
              description:
                "Technologie LED dernière génération consommant très peu d'énergie.",
            },
            {
              icon: "🛡️",
              title: "Sécurisé",
              description:
                "Vos données sont protégées avec les dernières normes de sécurité.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-12 dark:border-purple-800 dark:from-purple-900/20 dark:via-black dark:to-pink-900/20">
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Prêt à transformer
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              les routines de votre enfant ?
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Rejoignez des milliers de parents qui ont simplifié les couchers et les réveils avec Kidoo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:from-purple-700 hover:to-pink-700"
            >
              Commencer maintenant
            </Link>
            <Link
              href="#products"
              className="rounded-xl border border-zinc-300 px-8 py-3 font-semibold text-zinc-900 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600"></div>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">Kidoo</span>
            </Link>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              © {new Date().getFullYear()} Kidoo. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
