import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/mobile/logout
 * Déconnexion (côté client, les tokens sont simplement supprimés)
 * 
 * Note: Avec les JWT stateless, la déconnexion se fait côté client
 * en supprimant les tokens. Ce endpoint existe pour la cohérence de l'API
 * et pourrait être utilisé pour une blacklist de tokens si nécessaire.
 */
export async function POST(request: NextRequest) {
  // Pour l'instant, on retourne simplement un succès
  // Le client supprimera les tokens de son côté
  
  // TODO: Implémenter une blacklist de refresh tokens si nécessaire
  // pour une vraie invalidation côté serveur
  
  return NextResponse.json({
    success: true,
    message: 'Déconnexion réussie',
  });
}
