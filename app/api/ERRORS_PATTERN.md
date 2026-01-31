# Pattern de gestion des erreurs par route

Chaque route API a son propre fichier `errors.ts` pour gérer les erreurs spécifiques à cette route.

## Structure

```
app/api/
  ├── kidoos/
  │   ├── route.ts
  │   └── errors.ts          # Erreurs pour /api/kidoos
  ├── kidoos/[id]/
  │   ├── route.ts
  │   └── errors.ts          # Erreurs pour /api/kidoos/[id]
  └── auth/mobile/
      ├── route.ts
      └── errors.ts           # Erreurs pour /api/auth/mobile
```

## Exemple de fichier errors.ts

```typescript
/**
 * Erreurs spécifiques aux routes /api/kidoos
 */

import { ErrorDefinition } from '@/lib/api-response';

/**
 * Codes d'erreur pour les routes kidoos
 * Note: Les clés de traduction (i18n) sont gérées côté app mobile
 */
export const KidoosErrors = {
  // Validation
  VALIDATION_ERROR: {
    code: 'KIDOOS_VALIDATION_ERROR',
    status: 400,
    message: 'Erreur de validation des données',
  },
  
  // Conflits
  ALREADY_REGISTERED: {
    code: 'KIDOOS_ALREADY_REGISTERED',
    status: 409,
    message: 'Ce Kidoo est déjà enregistré',
  },
  
  // Serveur
  INTERNAL_ERROR: {
    code: 'KIDOOS_INTERNAL_ERROR',
    status: 500,
    message: 'Une erreur est survenue lors de la gestion des Kidoos',
  },
} as const satisfies Record<string, ErrorDefinition>;
```

## Utilisation dans route.ts

```typescript
import { createErrorResponse } from '@/lib/api-response';
import { KidoosErrors } from './errors';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  // Validation
  if (!validationResult.success) {
    return createErrorResponse(KidoosErrors.VALIDATION_ERROR, {
      message: firstError.message,
      field: firstError.path[0] as string,
    });
  }
  
  // Conflit
  if (existingKidoo) {
    return createErrorResponse(KidoosErrors.ALREADY_REGISTERED, {
      field: 'deviceId',
    });
  }
  
  // Erreur serveur
  try {
    // ...
  } catch (error) {
    return createErrorResponse(KidoosErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
```

## Structure de réponse d'erreur

```typescript
{
  success: false,
  error: "Message en français (pour debug/logs)",
  errorCode: "KIDOO_NOT_FOUND",  // Code d'erreur unique
  field?: "deviceId",            // Optionnel (pour erreurs de validation)
  details?: {...}                // Optionnel (dev seulement)
}
```

**Note importante** : Le serveur ne retourne que le `errorCode`. L'app mobile doit faire le mapping `errorCode` → `errorKey` (clé i18n) dans son code.

## Avantages

1. **Modularité** : Chaque route gère ses propres erreurs
2. **Maintenabilité** : Facile de trouver et modifier les erreurs d'une route
3. **Clarté** : Les erreurs sont proches du code qui les utilise
4. **Type-safe** : TypeScript garantit l'utilisation correcte des codes d'erreur
5. **Découplage** : Le serveur ne connaît pas la structure des traductions de l'app
6. **Flexibilité** : L'app peut mapper les codes d'erreur vers différentes clés selon le contexte
