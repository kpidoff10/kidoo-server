# Configuration NextAuth.js v5

NextAuth.js v5 (Auth.js) est configuré pour gérer l'authentification avec Prisma et PostgreSQL/Neon.

## Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env` :

```env
# Base de données (déjà configurée)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# NextAuth - Secret pour signer les tokens JWT
# Générez un secret sécurisé avec: openssl rand -base64 32
NEXTAUTH_SECRET="votre-secret-super-securise"

# Optionnel : URL de base de l'application (pour les callbacks)
# NEXTAUTH_URL="http://localhost:3000"
```

## Générer NEXTAUTH_SECRET

Pour générer un secret sécurisé :

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString()))
```

## Utilisation dans les composants

### Server Components

```typescript
import { auth } from '@/auth';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    return <div>Non connecté</div>;
  }

  return <div>Bienvenue {session.user.email}</div>;
}
```

### Server Actions

```typescript
'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function getUserKidoos() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non authentifié');
  }

  return await prisma.kidoo.findMany({
    where: { userId: session.user.id },
  });
}
```

### Client Components

```typescript
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Chargement...</div>;
  }

  if (session) {
    return (
      <>
        <p>Connecté en tant que {session.user?.email}</p>
        <button onClick={() => signOut()}>Déconnexion</button>
      </>
    );
  }

  return <button onClick={() => signIn()}>Connexion</button>;
}
```

## Providers d'authentification

Actuellement, un provider **Credentials** (email/password) est configuré. Pour ajouter d'autres providers (Google, GitHub, etc.) :

1. Installez le package du provider (si nécessaire)
2. Ajoutez le provider dans `auth.ts`
3. Configurez les variables d'environnement correspondantes

Exemple pour Google :

```typescript
import Google from 'next-auth/providers/google';

// Dans auth.ts
providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  // ... autres providers
]
```

## Inscription d'utilisateur

Pour permettre l'inscription, créez une Server Action :

```typescript
'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function registerUser(email: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return user;
}
```

## Protection des routes

Le proxy (`proxy.ts`) protège automatiquement toutes les routes sauf :
- `/auth/signin`
- `/auth/signout`
- `/api/auth/*`

Pour modifier les routes protégées, éditez `proxy.ts`.

**Note :** Dans Next.js 16, la convention `middleware.ts` a été remplacée par `proxy.ts`.
