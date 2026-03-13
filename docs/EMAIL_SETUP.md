# Configuration Email avec Resend

Ce guide explique comment configurer et utiliser le service d'envoi d'emails Resend dans Kidoo.

## 📋 Table des matières

1. [Configuration initiale](#configuration-initiale)
2. [Variables d'environnement](#variables-denvironnement)
3. [Architecture du service](#architecture-du-service)
4. [Templates disponibles](#templates-disponibles)
5. [Intégration dans le code](#intégration-dans-le-code)
6. [Tests](#tests)
7. [Bonnes pratiques](#bonnes-pratiques)

## Configuration initiale

### 1. Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte
3. Générez une clé API dans le dashboard
4. Notez votre clé API

### 2. Configurer votre domaine

Pour envoyer des emails depuis `noreply@kidoo.app`:

1. Dans le dashboard Resend, allez à "Domains"
2. Ajoutez votre domaine (ex: `kidoo.app`)
3. Suivez les instructions pour ajouter les enregistrements DNS
4. Une fois vérifié, utilisez n'importe quelle adresse `@kidoo.app`

### 3. Domaine de test

Pour le développement, Resend fourni un domaine de test gratuit:

```
delivered@resend.dev  # Reçoit tous les emails de test
```

Les emails vers cette adresse sont interceptés et affichés dans le dashboard.

## Variables d'environnement

Ajoutez ces variables à votre `.env.local`:

```env
# Clé API Resend (obligatoire)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Email source (optionnel, default: noreply@kidoo.app)
EMAIL_FROM=noreply@kidoo.app

# Email de test pour development (optionnel)
EMAIL_TEST=delivered@resend.dev

# URLs de l'application (pour les liens dans les emails)
NEXTAUTH_URL=http://localhost:3000
```

## Architecture du service

### Fichiers clés

```
lib/
├── email.ts                  # Service principal d'envoi
├── email-constants.ts        # URLs et constantes

app/components/emails/
├── WelcomeEmail.tsx          # Template bienvenue
├── PasswordResetEmail.tsx    # Template reset password
└── NightimeAlertEmail.tsx    # Template notifications
```

### Service emailService

Localisé dans `lib/email.ts`, il expose les méthodes:

```typescript
emailService.sendWelcomeEmail(email, userName, loginUrl)
emailService.sendPasswordResetEmail(email, userName, resetUrl, expiryMinutes)
emailService.sendNighttimeAlertEmail(email, userName, kidooName, alertType, appUrl)
emailService.sendGenericEmail(email, subject, html)
```

## Templates disponibles

### 1. WelcomeEmail

Envoyé lors de la création d'un compte.

**Quand l'utiliser:**
- Après l'inscription utilisateur

**Paramètres:**
- `userName`: Nom de l'utilisateur
- `loginUrl`: URL pour se connecter

**Exemple:**
```typescript
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John',
  'https://app.kidoo.com/login'
);
```

### 2. PasswordResetEmail

Envoyé pour la réinitialisation de mot de passe.

**Quand l'utiliser:**
- Lorsque l'utilisateur demande un reset password

**Paramètres:**
- `userName`: Nom de l'utilisateur
- `resetUrl`: Lien pour réinitialiser (doit inclure le token)
- `expiryMinutes`: Minutes avant expiration (défaut: 60)

**Exemple:**
```typescript
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'John',
  'https://app.kidoo.com/reset?token=abc123',
  60
);
```

### 3. NighttimeAlertEmail

Envoyé pour les alertes device et sommeil.

**Quand l'utiliser:**
- Device hors ligne/en ligne
- Alerte sommeil déclenchée

**Paramètres:**
- `userName`: Nom de l'utilisateur
- `kidooName`: Nom du device/kidoo
- `alertType`: `'device-offline'` | `'device-online'` | `'nighttime-alert'`
- `appUrl`: URL de l'app dashboard
- `timestamp`: ISO timestamp (auto-generated)

**Exemple:**
```typescript
await emailService.sendNighttimeAlertEmail(
  'user@example.com',
  'John',
  'Milo',
  'device-offline',
  'https://app.kidoo.com/dashboard'
);
```

## Intégration dans le code

### Route d'inscription (déjà intégrée)

Voir: `app/api/auth/register/route.ts`

```typescript
import { emailService } from '@/lib/email';
import { getLoginUrl } from '@/lib/email-constants';

// Après créer l'utilisateur
await emailService.sendWelcomeEmail(
  user.email,
  user.name || 'Utilisateur',
  getLoginUrl()
);
```

### Intégrer dans une autre route

1. Importez le service:
```typescript
import { emailService } from '@/lib/email';
import { getLoginUrl, getPasswordResetUrl, getAppUrl } from '@/lib/email-constants';
```

2. Appelez la méthode appropriée:
```typescript
try {
  await emailService.sendPasswordResetEmail(
    email,
    userName,
    getPasswordResetUrl(resetToken),
    60
  );
} catch (error) {
  console.error('Erreur email:', error);
  // Gérer l'erreur
}
```

### Bonnes pratiques

- **Non-bloquant**: Enveloppez dans try-catch mais ne bloquez pas la réponse
- **Logging**: Log les erreurs d'email pour debugging
- **Async**: Utilisez await pour attendre la confirmation
- **Erreurs gracieuses**: Si l'email échoue, continuez le flux métier

## Tests

### Route de test

Une route de test est disponible: `POST /api/test/send-email`

#### Développement (GET)

Voir les instructions:
```bash
curl http://localhost:3000/api/test/send-email
```

#### Tester l'envoi (POST)

**1. Email de bienvenue:**
```bash
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "email": "delivered@resend.dev",
    "name": "John"
  }'
```

**2. Reset password:**
```bash
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "password-reset",
    "email": "delivered@resend.dev",
    "name": "John"
  }'
```

**3. Alerte device:**
```bash
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "alert",
    "email": "delivered@resend.dev",
    "name": "John",
    "kidooName": "Milo",
    "alertType": "device-offline"
  }'
```

### Voir les résultats

1. Allez sur [resend.com/emails](https://resend.com/emails)
2. Connectez-vous avec votre compte
3. Les emails de test vers `delivered@resend.dev` apparaissent immédiatement

## Bonnes pratiques

### Gestion des erreurs

```typescript
try {
  await emailService.sendWelcomeEmail(email, name, loginUrl);
} catch (error) {
  // Log l'erreur mais ne bloquez pas
  console.error('Email non-envoyé:', error);
  // L'utilisateur peut quand même se connecter
}
```

### Utiliser les constantes

```typescript
import { getLoginUrl, getPasswordResetUrl, getAppUrl } from '@/lib/email-constants';

// Au lieu d'hardcoder les URLs
await emailService.sendWelcomeEmail(
  email,
  name,
  getLoginUrl()  // Respecte NEXTAUTH_URL
);
```

### Personnalisation

Pour personnaliser un template, modifiez le fichier .tsx correspondant:

```typescript
// app/components/emails/WelcomeEmail.tsx

export const WelcomeEmail = ({ userName, loginUrl }: WelcomeEmailProps) => {
  return (
    <Html>
      {/* Modifiez le HTML ici */}
    </Html>
  );
};
```

Les changements se reflètent immédiatement dans les prochains emails envoyés.

### Ajouter de nouveaux templates

1. Créez un nouveau fichier `app/components/emails/YourEmail.tsx`
2. Définissez le composant React Email
3. Ajoutez une méthode dans `emailService` dans `lib/email.ts`
4. Utilisez-le dans votre route

Exemple:

```typescript
// app/components/emails/InviteEmail.tsx
export const InviteEmail = ({ userName, inviteUrl }) => (
  <Html>
    <Body>
      <Text>Vous êtes invité à rejoindre Kidoo!</Text>
    </Body>
  </Html>
);

// lib/email.ts
async sendInviteEmail(email: string, userName: string, inviteUrl: string) {
  const html = render(InviteEmail({ userName, inviteUrl }));
  return await resend.emails.send({
    from: getFromEmail(),
    to: email,
    subject: 'Vous êtes invité!',
    html,
  });
}
```

## Dépannage

### "Erreur: invalid_api_key"

- Vérifiez que `RESEND_API_KEY` est défini dans `.env.local`
- Vérifiez que la clé n'a pas de caractères blancs

### "Email n'est pas envoyé"

- Confirmez que le domaine est vérifié dans Resend
- En dev, utilisez `delivered@resend.dev` pour tester

### "Erreur 500 sur la route"

- Vérifiez les logs du serveur
- Assurez-vous que les dépendances `resend` et `@react-email/components` sont installées

### Emails ne s'affichent pas dans Resend

- Vérifiez que vous êtes connecté au bon compte Resend
- Les emails vers `delivered@resend.dev` s'affichent dans l'onglet "Emails"

## Ressources

- [Documentation Resend](https://resend.com/docs)
- [React Email](https://react.email/)
- [Exemples de templates](https://react.email/examples)
