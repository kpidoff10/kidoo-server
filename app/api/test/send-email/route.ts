import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/email";
import {
  getLoginUrl,
  getPasswordResetUrl,
  getAppUrl,
  emailConfig,
} from "@/lib/email-constants";

/**
 * POST /api/test/send-email
 * Route de test pour envoyer des emails
 *
 * Body:
 * {
 *   "type": "welcome" | "password-reset" | "alert",
 *   "email": "user@example.com",
 *   "name": "John",
 *   "kidooName": "Milo" (pour alert)
 *   "alertType": "device-offline" | "device-online" | "nighttime-alert" (pour alert)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: À remplacer par une authentification vraie en production
    // Pour dev/test uniquement
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Cette route n'est disponible qu'en développement" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, email, name, kidooName, alertType } = body;

    if (!type || !email) {
      return NextResponse.json(
        { error: "type et email requis" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "welcome":
        result = await emailService.sendWelcomeEmail(
          email,
          name || "Utilisateur",
          getLoginUrl()
        );
        break;

      case "password-reset":
        result = await emailService.sendPasswordResetEmail(
          email,
          name || "Utilisateur",
          getPasswordResetUrl("demo-token-12345"),
          60
        );
        break;

      case "alert":
        if (!kidooName || !alertType) {
          return NextResponse.json(
            {
              error:
                "kidooName et alertType requis pour type=alert",
            },
            { status: 400 }
          );
        }

        result = await emailService.sendNighttimeAlertEmail(
          email,
          name || "Utilisateur",
          kidooName,
          alertType as "device-offline" | "device-online" | "nighttime-alert",
          getAppUrl()
        );
        break;

      default:
        return NextResponse.json(
          { error: `Type d'email inconnu: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Email ${type} envoyé avec succès`,
        emailId: result?.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de l'envoi du test email:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'envoi de l'email",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/send-email
 * Retourne les instructions et exemples
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Cette route n'est disponible qu'en développement" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: "Route de test d'envoi d'emails",
    endpoint: "POST /api/test/send-email",
    examples: {
      welcome: {
        type: "welcome",
        email: "user@example.com",
        name: "John Doe",
      },
      passwordReset: {
        type: "password-reset",
        email: "user@example.com",
        name: "John Doe",
      },
      deviceOffline: {
        type: "alert",
        email: "user@example.com",
        name: "John Doe",
        kidooName: "Milo",
        alertType: "device-offline",
      },
      deviceOnline: {
        type: "alert",
        email: "user@example.com",
        name: "John Doe",
        kidooName: "Milo",
        alertType: "device-online",
      },
      nighttimeAlert: {
        type: "alert",
        email: "user@example.com",
        name: "John Doe",
        kidooName: "Milo",
        alertType: "nighttime-alert",
      },
    },
    testEmail: emailConfig.testEmail,
    notes: [
      "Cette route est uniquement disponible en développement",
      `Utilisez "${emailConfig.testEmail}" pour tester sans vraiment envoyer d'emails`,
      "L'email sera visible dans le dashboard Resend",
    ],
  });
}
