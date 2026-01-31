import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy pour gérer les requêtes réseau
 * 
 * Dans Next.js 16, la convention "middleware" a été remplacée par "proxy"
 * pour clarifier le rôle du fichier en tant qu'intermédiaire réseau.
 * 
 * Ce proxy gère :
 * - CORS pour l'app mobile
 * - Les routes publiques (pas de vérification d'auth)
 * - Les routes API mobiles (authentification mobile)
 * - Les routes statiques et assets
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Redirection pour le sous-domaine API : api.kidoo-box.com
  // Si la requête vient de api.kidoo-box.com et que le chemin ne commence pas par /api
  if (hostname === 'api.kidoo-box.com' && !pathname.startsWith('/api')) {
    const url = request.nextUrl.clone();
    url.pathname = `/api${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Gérer les requêtes preflight OPTIONS (CORS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Routes publiques (pas de vérification d'auth nécessaire)
  const publicRoutes = [
    '/auth/signin',
    '/auth/signup',
    '/auth/signout',
    '/api/auth',
    '/api/auth/register',
    '/api/auth/mobile',
  ];
  
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  
  // Routes API mobiles publiques (authentification mobile)
  const isMobileAuthRoute = pathname.startsWith('/api/auth/mobile');

  // Routes statiques et assets
  const isStaticRoute =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/);

  // Créer la réponse
  const response = NextResponse.next();

  // Ajouter les headers CORS pour les routes API
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

// Configuration du matcher pour optimiser les performances
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
  // Note: Le proxy s'exécute toujours dans le runtime Node.js dans Next.js 16
  // La configuration runtime n'est plus nécessaire ici
};
