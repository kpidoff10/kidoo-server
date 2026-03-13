# 📧 Exemples d'Intégration Email

Ce document montre comment intégrer l'envoi d'emails dans différents scénarios de Kidoo.

## 🎯 Cas d'usage courants

### 1. Envoyer un email quand une alerte veilleuse se déclenche

**Fichier:** Modifier `lib/nighttime-alert.ts`

```typescript
import { emailService } from '@/lib/email';
import { getAppUrl } from '@/lib/email-constants';

export async function processNighttimeAlert(mac: string): Promise<...> {
  // ... code existant ...

  if (!kidoo?.userId || !kidoo.configDream?.nighttimeAlertEnabled) {
    return { ok: false, pushed: 0, reason: 'kidoo_not_found_or_disabled', status: 200 };
  }

  // Récupérer l'utilisateur pour l'email
  const user = await prisma.user.findUnique({
    where: { id: kidoo.userId },
    select: { email: true, name: true },
  });

  // ✅ NOUVEAU: Envoyer l'email de notification
  if (user) {
    try {
      await emailService.sendNighttimeAlertEmail(
        user.email,
        user.name || 'Utilisateur',
        kidoo.name || 'Veilleuse',
        'nighttime-alert',
        getAppUrl()
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'alerte email:', error);
      // Continue même si l'email échoue
    }
  }

  // Créer une notification en DB
  await prisma.notification.create({
    data: {
      userId: kidoo.userId,
      kidooId: kidoo.id,
      type: 'nighttime-alert',
    },
  });

  // ... rest existant ...
}
```

---

### 2. Envoyer un email quand un device se déconnecte

**Contexte:** PubNub ou webhook device offline

**Exemple de route API:**

```typescript
// app/api/webhooks/device-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { getAppUrl } from '@/lib/email-constants';

/**
 * POST /api/webhooks/device-status
 * Webhook pour les changements de status du device
 *
 * Body:
 * {
 *   "macAddress": "AA:BB:CC:DD:EE:FF",
 *   "status": "offline" | "online"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { macAddress, status } = body;

    if (!macAddress || !status) {
      return NextResponse.json(
        { error: 'macAddress et status requis' },
        { status: 400 }
      );
    }

    // Normaliser la MAC
    const normalizedMac = macAddress.replace(/[:.\-]/g, '').toUpperCase();

    // Trouver le device
    const kidoo = await prisma.kidoo.findFirst({
      where: {
        macAddress: {
          equals: normalizedMac,
          mode: 'insensitive',
        },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!kidoo || !kidoo.user) {
      return NextResponse.json(
        { ok: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    // Mettre à jour le status
    await prisma.kidoo.update({
      where: { id: kidoo.id },
      data: { isOnline: status === 'online' },
    });

    // ✅ Envoyer email si offline
    if (status === 'offline') {
      try {
        await emailService.sendNighttimeAlertEmail(
          kidoo.user.email,
          kidoo.user.name || 'Utilisateur',
          kidoo.name,
          'device-offline',
          getAppUrl()
        );

        // Créer une notification en DB aussi
        await prisma.notification.create({
          data: {
            userId: kidoo.userId,
            kidooId: kidoo.id,
            type: 'device-offline',
          },
        });
      } catch (error) {
        console.error('Erreur lors du traitement device-offline:', error);
      }
    }

    // ✅ Envoyer email si online (optionnel)
    if (status === 'online') {
      try {
        await emailService.sendNighttimeAlertEmail(
          kidoo.user.email,
          kidoo.user.name || 'Utilisateur',
          kidoo.name,
          'device-online',
          getAppUrl()
        );
      } catch (error) {
        console.error('Erreur lors du traitement device-online:', error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Device ${status}`,
      emailSent: true,
    });
  } catch (error) {
    console.error('Erreur webhook device-status:', error);

    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### 3. Envoyer un email lors de modifications de configuration

**Exemple:** Admin notifie parent de changement

```typescript
// app/api/devices/[id]/config/update
import { emailService } from '@/lib/email';
import { render } from '@react-email/components';
import { Html, Body, Text } from '@react-email/components';

export async function PATCH(request: NextRequest) {
  // ... validation ...

  const ConfigUpdatedEmail = ({ userName, deviceName, changes }) => (
    <Html>
      <Body>
        <Text>Bonjour {userName},</Text>
        <Text>
          La configuration de {deviceName} a été mise à jour:
        </Text>
        <ul>
          {Object.entries(changes).map(([key, value]) => (
            <li key={key}>{key}: {value as any}</li>
          ))}
        </ul>
        <Text>
          <a href={`${getAppUrl()}/devices/${deviceId}`}>
            Voir les détails
          </a>
        </Text>
      </Body>
    </Html>
  );

  const html = await render(
    ConfigUpdatedEmail({
      userName: user.name,
      deviceName: kidoo.name,
      changes,
    })
  );

  try {
    await emailService.sendGenericEmail(
      user.email,
      `Configuration mise à jour: ${kidoo.name}`,
      html
    );
  } catch (error) {
    console.error('Email config update échoué:', error);
  }

  // ... continue ...
}
```

---

### 4. Envoyer un email de confirmation d'achat

**Exemple: Intégration store**

```typescript
import { emailService } from '@/lib/email';
import { Html, Body, Text, Button } from '@react-email/components';

const PurchaseConfirmationEmail = ({ userName, productName, price, orderId }) => (
  <Html>
    <Body>
      <Text>Merci {userName}!</Text>
      <Text>Votre commande de {productName} a été confirmée.</Text>
      <Text>Montant: €{price}</Text>
      <Text>Numéro de commande: {orderId}</Text>
      <Button href={`${getAppUrl()}/orders/${orderId}`}>
        Voir ma commande
      </Button>
    </Body>
  </Html>
);

// ... plus tard ...
const html = await render(
  PurchaseConfirmationEmail({
    userName: user.name,
    productName: 'Pack Kidoo Premium',
    price: '29.99',
    orderId: order.id,
  })
);

await emailService.sendGenericEmail(
  user.email,
  'Confirmation de commande #' + order.id,
  html
);
```

---

## 🔄 Patterns réutilisables

### Pattern: Envoyer un email non-bloquant

```typescript
// Dans une route API, envoyer l'email sans bloquer
async function handleRequest() {
  // Faire le travail principal
  const result = await doSomething();

  // Envoyer l'email en arrière-plan
  emailService.sendWelcomeEmail(
    email,
    name,
    loginUrl
  ).catch(err => {
    console.error('Email échoué (non-bloquant):', err);
    // L'erreur n'affecte pas la réponse
  });

  // Retourner la réponse tout de suite
  return NextResponse.json({ success: true });
}
```

### Pattern: Créer un template réutilisable

```typescript
// emails/BaseEmail.tsx
export const BaseEmail = ({ title, children }) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logo}>🌙 Kidoo</Text>
        </Section>
        <Section style={content}>
          {children}
        </Section>
        <Section style={footer}>
          {/* footer */}
        </Section>
      </Container>
    </Body>
  </Html>
);

// Puis réutiliser:
const MyEmail = () => (
  <BaseEmail title="Mon Email">
    <Text>Contenu personnalisé</Text>
  </BaseEmail>
);
```

### Pattern: Queue d'emails (pour plus tard)

```typescript
// Si vous avez besoin de queue d'emails complexes
// (ex: batch send, retry, etc)

interface EmailJob {
  type: 'welcome' | 'reset' | 'alert';
  email: string;
  userId: string;
  data: Record<string, any>;
  attempts: number;
  nextRetry?: Date;
}

// Sauvegarder dans une table EmailQueue
await prisma.emailQueue.create({
  data: {
    type: 'welcome',
    email: user.email,
    userId: user.id,
    data: { name: user.name, loginUrl },
    attempts: 0,
  },
});

// Un cron job traite la queue
// app/api/cron/process-email-queue
```

---

## 🧪 Tester les intégrations

### Via la route de test

```bash
# Tester une alerte device-offline
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

### Vérifier les résultats

1. Dashboard Resend: https://resend.com/emails
2. Emails apparaissent en temps réel

---

## ✅ Checklist d'intégration

- [ ] Installer dépendances (`npm install resend @react-email/components`)
- [ ] Ajouter `RESEND_API_KEY` à `.env.local`
- [ ] Tester la route `/api/test/send-email`
- [ ] Intégrer dans `POST /api/auth/register`
- [ ] Créer modèle Prisma pour reset password
- [ ] Intégrer dans `POST /api/auth/request-password-reset`
- [ ] Intégrer dans alerte veilleuse (`lib/nighttime-alert.ts`)
- [ ] Intégrer dans webhook device status
- [ ] Tester toutes les intégrations
- [ ] Mettre en prod avec vrais domaines

---

## 📚 Ressources

- **Resend Docs:** https://resend.com/docs
- **React Email:** https://react.email
- **Setup complet:** `docs/EMAIL_SETUP.md`
- **Implémentation:** `IMPLEMENTATION_EMAIL.md`
