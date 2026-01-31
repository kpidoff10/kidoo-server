# Exemples d'utilisation NextAuth.js v5

## Server Actions - Créer un utilisateur (Inscription)

```typescript
// app/actions/auth.ts
'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function registerUser(
  email: string,
  password: string,
  name: string
) {
  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Un utilisateur avec cet email existe déjà');
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Créer l'utilisateur
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return { success: true, userId: user.id };
}
```

## Server Actions - Connexion

```typescript
// app/actions/auth.ts (continuation)
import { signIn } from '@/auth';

export async function loginUser(email: string, password: string) {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Identifiants invalides' };
  }
}
```

## Server Components - Afficher les informations utilisateur

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenue, {session.user.email}</p>
      <p>ID: {session.user.id}</p>
    </div>
  );
}
```

## Server Actions - Récupérer les Kidoos de l'utilisateur

```typescript
// app/actions/kidoos.ts
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
    orderBy: { createdAt: 'desc' },
  });
}
```

## Client Components - Bouton de connexion/déconnexion

Pour NextAuth v5, vous devez installer `next-auth` qui inclut les hooks React :

```typescript
// app/components/AuthButton.tsx
'use client';

import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthButton() {
  const router = useRouter();

  const handleSignIn = async () => {
    await signIn('credentials', {
      email: 'user@example.com',
      password: 'password',
      redirect: true,
      callbackUrl: '/dashboard',
    });
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  };

  return (
    <div>
      <button onClick={handleSignIn}>Connexion</button>
      <button onClick={handleSignOut}>Déconnexion</button>
    </div>
  );
}
```

## Formulaires de connexion/inscription

```typescript
// app/auth/signin/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Identifiants invalides');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Une erreur est survenue');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Se connecter</button>
    </form>
  );
}
```

## Proxy personnalisé (si besoin)

Le proxy par défaut redirige vers `/auth/signin` si non connecté. Pour personnaliser :

```typescript
// proxy.ts (exemple avancé)
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Admin routes
  if (pathname.startsWith('/admin') && isLoggedIn) {
    // Vérifier le rôle admin ici si nécessaire
    // if (req.auth.user.role !== 'admin') { ... }
  }

  // API routes protégées
  if (pathname.startsWith('/api/protected') && !isLoggedIn) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  return NextResponse.next();
});
```
