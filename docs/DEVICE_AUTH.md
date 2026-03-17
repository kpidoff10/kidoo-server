# Device Authentication avec withDeviceAuth

## Vue d'ensemble

`withDeviceAuth` est un middleware/wrapper pour protéger les routes appelées par les ESP32 (appareils Kidoo). Il gère:

- ✅ Vérification de la signature Ed25519
- ✅ Normalisation du format MAC address
- ✅ Protection contre le replay (vérification du timestamp)
- ✅ Rétrocompatibilité (accepte les devices sans clé publique)

## Architecture de sécurité

```
ESP32                          Serveur
  │                               │
  ├─ Génère clé Ed25519          │
  │  (privée + publique)          │
  │                               │
  ├─ Setup BLE → envoie public key│
  │                              │
  │                    Stocke public key
  │                              │
  ├─ Signe requête avec clé privée│
  │  (message = METHOD\nPATH\nTIMESTAMP)
  │                              │
  ├─ Envoie signature dans headers│
  │  (x-kidoo-signature)          │
  │                              │
  ├─ Envoie timestamp             │
  │  (x-kidoo-timestamp)          │
  │                              │
  ├─ Envoie MAC address en URL    │
  │  (/api/devices/{MAC}/...)     │
  │                              │
  │                    withDeviceAuth:
  │                    1. Cherche device par MAC
  │                    2. Récupère public key
  │                    3. Reconstruit message
  │                    4. Vérifie signature
  │                    5. Vérifie timestamp
  │                              │
  │                    ✅ Signature valide
  │                    Appelle handler
  │                              │
  ├─ Reçoit réponse              │
  │                              │
```

## Comment l'utiliser

### Exemple basique

```typescript
import { NextResponse } from 'next/server';
import { withDeviceAuth } from '@/lib/withDeviceAuth';

export const GET = withDeviceAuth(async (request, { params }) => {
  // À ce stade, la signature a été vérifiée ✅
  const { mac } = await params;

  // request.kidooId contient l'ID du Kidoo (device authentifié)

  return NextResponse.json({
    success: true,
    message: 'Device authentifié!',
  });
});
```

### Avec logique métier

```typescript
import { NextResponse } from 'next/server';
import { withDeviceAuth, DeviceAuthenticatedRequest } from '@/lib/withDeviceAuth';
import { prisma } from '@/lib/prisma';

async function handler(
  request: DeviceAuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { mac } = await params;

  // Récupérer la configuration du device
  const config = await prisma.kidooConfigDream.findFirst({
    where: { kidooId: request.kidooId },
  });

  if (!config) {
    return NextResponse.json(
      { error: 'Config not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    config: {
      bedtime: config.bedtimeName,
      wakeup: config.wakeupName,
    },
  });
}

export const GET = withDeviceAuth(handler);
```

## Flux de vérification détaillé

### 1️⃣ Extraction des paramètres

```
URL: GET /api/devices/80B54ED96148/mqtt-token
     x-kidoo-signature: Gx7s5k3+9mJ2nP1q8r...
     x-kidoo-timestamp: 1710720000

Paramètres extraits:
├─ MAC: 80B54ED96148
├─ Signature: Gx7s5k3+9mJ2nP1q8r... (base64)
└─ Timestamp: 1710720000 (Unix timestamp)
```

### 2️⃣ Normalisation du MAC

```typescript
// Format acceptés (tous normalisés vers le même)
80B54ED96148           → 80B54ED96148
80:B5:4E:D9:61:48      → 80B54ED96148
80-B5-4E-D9-61-48      → 80B54ED96148
80.B5.4E.D9.61.48      → 80B54ED96148
```

### 3️⃣ Recherche du device en base

```typescript
// Trouve le Kidoo avec n'importe quel format de MAC
const kidoo = await prisma.kidoo.findMany({...});
const device = kidoo.find(k =>
  normalizeMac(k.macAddress) === normalizedMac
);
```

### 4️⃣ Vérification du timestamp

```typescript
// Tolerance: 15 minutes (900 secondes)
// Protection contre le replay attack

const now = Math.floor(Date.now() / 1000);
const diff = Math.abs(now - timestamp);

if (diff > 900) {
  // ❌ Rejeté: timestamp expiré
}
```

### 5️⃣ Vérification de la signature

```typescript
// Message reconstitué (identique à l'ESP32):
// METHOD\nPATH\nTIMESTAMP

const message = "GET\n/api/devices/80B54ED96148/mqtt-token\n1710720000";

// Vérifier avec tweetnacl
const verified = nacl.sign.detached.verify(
  messageBuffer,
  signatureBuffer,
  publicKeyBuffer
);
```

## Rétrocompatibilité

Si un Kidoo n'a pas de `publicKey` en base de données:

```typescript
if (!kidoo.publicKey) {
  // ✅ Accepté sans vérification (rétrocompatibilité)
  return { success: true, kidooId: kidoo.id };
}
```

Cela permet à l'ancien matériel sans Ed25519 de continuer à fonctionner.

## Mode développement

En `NODE_ENV=development`, la vérification de signature est **bypassée**:

```typescript
if (isDevelopmentEnv()) {
  console.log('[withDeviceAuth] 🔓 MODE DEV: Bypass signature verification');
  return { success: true, kidooId: kidoo.id };
}
```

Cela facilite le debug sans avoir à signer les requêtes locales.

## Routes utilisant withDeviceAuth

| Route | Purpose |
|-------|---------|
| `GET /api/devices/[mac]/mqtt-token` | Obtenir les credentials MQTT |
| `GET /api/devices/[mac]/config` | Récupérer la configuration |
| `GET /api/devices/[mac]/timezone` | Récupérer le fuseau horaire |
| `GET /api/devices/[mac]/nighttime-alert` | Traiter alerte tactile |

## Utilitaires associés

### `lib/mac-utils.ts`

Normalisation centralisée du MAC address:

```typescript
import { normalizeMac, macEquals, isValidMac, formatMac } from '@/lib/mac-utils';

normalizeMac('80:B5:4E:D9:61:48')  // → '80B54ED96148'
macEquals('80:B5:4E', '80-B5-4E')  // → true
isValidMac('80B54ED96148')         // → true (12 hex chars)
formatMac('80B54ED96148')          // → '80:B5:4E:D9:61:48'
```

### `lib/ed25519-verify.ts`

Vérification Ed25519 avec crypto.subtle:

```typescript
import { verifyEd25519Signature } from '@/lib/ed25519-verify';

const isValid = await verifyEd25519Signature(
  publicKeyBase64,
  message,
  signatureBase64
);
```

## Debugging

### Activer les logs détaillés

Mettre `NODE_ENV=development`:

```bash
NODE_ENV=development npm run dev
```

Logs affichés:
```
[withDeviceAuth] DEBUG sigFull=true len=88 | sigA=false sigB=false | ts=true
[withDeviceAuth] signature.length: 64 (attendu: 64)
[withDeviceAuth] publicKey.length: 32 (attendu: 32)
[withDeviceAuth] Message: GET\n/api/devices/80B54ED96148/mqtt-token\n1710720000
```

### Erreurs courantes

| Erreur | Cause |
|--------|-------|
| `"Signature device invalide"` | Signature ne correspond pas au message |
| `"Timestamp expiré"` | RTC ESP32 désynchronisé (> 15 min de drift) |
| `"Adresse MAC manquante"` | URL ne contient pas le MAC |
| `"Kidoo non trouvé"` | Device non créé ou MAC différent |

## Sécurité

✅ **Signature Ed25519**: Impossible de forger une signature sans la clé privée
✅ **Timestamp**: Empêche le replay d'une vieille requête
✅ **MAC normalisé**: Format accepte plusieurs variantes (sécurité contre les typos)
✅ **Rétrocompatibilité**: Devices anciens sans clé publique toujours acceptés
✅ **Mode dev**: Bypass possible pour développement local

## Performance

- Recherche du device: O(n) où n = nombre de devices
- Vérification signature: ~1-2ms (tweetnacl)
- **Optimization possible**: Indexer par MAC en base (diminuerait O(n) à O(1))

---

**Dernière mise à jour**: Mars 2026
