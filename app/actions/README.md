# Server Actions - Authentification

Ce dossier contient les Server Actions pour l'authentification et la gestion des utilisateurs.

## Inscription (`registerUser`)

Crée un nouveau compte utilisateur avec validation des données.

### Utilisation dans un composant client

```typescript
'use client';

import { registerUser, type RegisterInput } from '@/app/actions/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const data: RegisterInput = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
    };

    const result = await registerUser(data);

    if (result.success) {
      // Rediriger vers la page de connexion après inscription réussie
      router.push('/auth/signin?registered=true');
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="text" name="name" placeholder="Nom" required />
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Mot de passe" required minLength={8} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer un compte'}
      </button>
    </form>
  );
}
```

### Utilisation avec useState (plus de contrôle)

```typescript
'use client';

import { registerUser, type RegisterInput } from '@/app/actions/auth';
import { useState } from 'react';

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await registerUser(formData);

    if (result.success) {
      alert('Compte créé avec succès !');
      // Rediriger ou réinitialiser le formulaire
      setFormData({ email: '', password: '', name: '' });
    } else {
      setError({ message: result.error, field: result.field });
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Nom"
        required
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
        aria-invalid={error?.field === 'email'}
      />
      {error?.field === 'email' && <p style={{ color: 'red' }}>{error.message}</p>}
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Mot de passe (min. 8 caractères)"
        required
        minLength={8}
        aria-invalid={error?.field === 'password'}
      />
      {error?.field === 'password' && <p style={{ color: 'red' }}>{error.message}</p>}
      {error && !error.field && <p style={{ color: 'red' }}>{error.message}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer un compte'}
      </button>
    </form>
  );
}
```

### Vérification de la disponibilité de l'email

```typescript
'use client';

import { checkEmailAvailability } from '@/app/actions/auth';
import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce'; // Hook personnalisé optionnel

export default function EmailInput() {
  const [email, setEmail] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const debouncedEmail = useDebounce(email, 500);

  const checkEmail = useCallback(async () => {
    if (!debouncedEmail || !debouncedEmail.includes('@')) {
      setAvailable(null);
      return;
    }

    const isAvailable = await checkEmailAvailability(debouncedEmail);
    setAvailable(isAvailable);
  }, [debouncedEmail]);

  // Appeler checkEmail quand debouncedEmail change
  React.useEffect(() => {
    checkEmail();
  }, [checkEmail]);

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      {available === true && <p style={{ color: 'green' }}>✓ Email disponible</p>}
      {available === false && <p style={{ color: 'red' }}>✗ Email déjà utilisé</p>}
    </div>
  );
}
```

## Validation

La Server Action `registerUser` valide automatiquement :
- **Email** : Format email valide
- **Password** : Minimum 8 caractères
- **Name** : Entre 2 et 100 caractères

Les erreurs de validation retournent un objet avec :
- `success: false`
- `error`: Message d'erreur
- `field`: Champ en erreur (optionnel)

## Réponses

### Succès
```typescript
{
  success: true,
  userId: string,
  message: string
}
```

### Erreur
```typescript
{
  success: false,
  error: string,
  field?: string // Champ en erreur (optionnel)
}
```

## Erreurs possibles

- **Email invalide** : `field: 'email'`
- **Mot de passe trop court** : `field: 'password'`
- **Nom invalide** : `field: 'name'`
- **Email déjà utilisé** : `field: 'email'`, erreur 409
- **Erreur serveur** : Message générique, erreur 500
