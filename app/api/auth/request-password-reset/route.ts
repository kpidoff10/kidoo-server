import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/email";
import { getPasswordResetUrl } from "@/lib/email-constants";
import crypto from "crypto";

/**
 * POST /api/auth/request-password-reset
 * Crée un token de reset password et envoie un email
 *
 * Body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Réponse:
 * {
 *   "success": true,
 *   "message": "Email de réinitialisation envoyé"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email requis" },
        { status: 400 }
      );
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Pour des raisons de sécurité, on répond toujours success
    // même si l'utilisateur n'existe pas
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Si cet email existe dans notre système, vous recevrez un lien de réinitialisation.",
        },
        { status: 200 }
      );
    }

    // Générer un code de reset (6 chiffres)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Sauvegarder le code avec une date d'expiration (1 heure)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: resetCode,
        resetCodeExpiresAt: expiresAt,
      },
    });

    // Envoyer l'email (non-bloquant)
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.name || "Utilisateur",
        resetCode,
        60 // expires in 60 minutes
      );
    } catch (emailError) {
      // Log mais ne bloque pas la réponse
      console.error("Erreur lors de l'envoi du reset email:", emailError);
      // L'utilisateur reçoit quand même une confirmation visuelle
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Si cet email existe dans notre système, vous recevrez un lien de réinitialisation.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la demande de reset password:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur est survenue. Veuillez réessayer plus tard.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/reset-password
 * Réinitialise le mot de passe avec le token
 *
 * Body:
 * {
 *   "token": "reset-token-from-email",
 *   "newPassword": "new-password"
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Token et nouveau mot de passe requis",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Le mot de passe doit contenir au moins 8 caractères",
        },
        { status: 400 }
      );
    }

    // Chercher l'utilisateur avec le code valide
    const user = await prisma.user.findFirst({
      where: {
        resetCode: token,
        resetCodeExpiresAt: {
          gt: new Date(), // Code doit être encore valide
        },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.",
        },
        { status: 400 }
      );
    }

    // Hash le nouveau mot de passe
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et nettoyer le code
    console.log("Updating password for user:", user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiresAt: null,
      },
    });
    console.log("Password updated successfully");

    const response = {
      success: true,
      message:
        "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
    };

    console.log("Sending response:", response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur est survenue lors de la réinitialisation. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}
