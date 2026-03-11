import { Product } from '@/lib/products';

interface ProductCardProps {
  product: Product;
}

const colorMap: Record<string, { container: string; text: string; badge: string; checkmark: string; border: string }> = {
  purple: {
    container: 'from-purple-100 dark:from-purple-900/30 border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-500',
    checkmark: 'text-purple-500',
    border: 'border-purple-200 dark:border-purple-800',
  },
  amber: {
    container: 'from-amber-100 dark:from-amber-900/30 border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500',
    checkmark: 'text-amber-500',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

export function ProductCard({ product }: ProductCardProps) {
  const isComingSoon = product.status === 'coming-soon';
  const colors = colorMap[product.color.primary] || colorMap['purple'];

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 ${
        isComingSoon
          ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900'
          : `${colors.border} bg-gradient-to-br ${colors.container} to-white hover:shadow-xl dark:to-zinc-900`
      }`}
    >
      {/* Badge */}
      {product.badge && !isComingSoon && (
        <div className="absolute right-0 top-0 z-10">
          <div className={`rounded-bl-2xl ${colors.badge} px-4 py-2 text-sm font-bold text-white`}>
            {product.badge}
          </div>
        </div>
      )}

      {isComingSoon && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 dark:bg-black/20">
          <div className="rounded-lg bg-white/90 px-6 py-3 text-center font-semibold text-zinc-900 backdrop-blur dark:bg-zinc-900/90 dark:text-zinc-50">
            Bientôt disponible
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* Image */}
        {product.image && (
          <div className="flex items-center justify-center p-8 sm:p-10">
            <div className="relative h-64 w-full max-w-sm">
              <svg
                className="h-full w-full opacity-90 transition-opacity group-hover:opacity-100"
                viewBox="0 0 1024 1024"
                xmlns="http://www.w3.org/2000/svg"
              >
                <use href={`${product.image}#svg`} />
              </svg>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative p-8 sm:p-10">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{product.name}</h3>
            <p className={`mt-2 text-lg font-semibold ${colors.text}`}>
              {product.tagline}
            </p>
          </div>

          {/* Description */}
          <p className="mb-8 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">{product.description}</p>

        {!isComingSoon && (
          <>
            {/* Routines */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {product.routines.map((routine) => (
                <div
                  key={routine.title}
                  className="rounded-xl border border-white/50 bg-white/30 p-4 backdrop-blur dark:border-zinc-800/50 dark:bg-zinc-800/20"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{routine.icon}</span>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{routine.title}</h4>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{routine.description}</p>
                </div>
              ))}
            </div>

            {/* Features */}
            <div>
              <h4 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Fonctionnalités incluses</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <svg className={`mt-0.5 h-5 w-5 flex-shrink-0 ${colors.checkmark}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
