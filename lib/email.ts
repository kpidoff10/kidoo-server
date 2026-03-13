import { Resend } from "resend";
import { render } from "@react-email/components";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import { NighttimeAlertEmail } from "@/emails/NightimeAlertEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

const getFromEmail = () => {
  return process.env.EMAIL_FROM || "noreply@kidoo.app";
};

export const emailService = {
  /**
   * Envoyer un email de bienvenue à un nouvel utilisateur
   */
  async sendWelcomeEmail(email: string, userName: string, loginUrl: string) {
    try {
      const html = await render(WelcomeEmail({ userName, loginUrl }));

      const response = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Bienvenue sur Kidoo! 🎉",
        html,
      });

      if (response.error) {
        console.error("Erreur lors de l'envoi du welcome email:", response.error);
        throw new Error(`Failed to send welcome email: ${response.error.message}`);
      }

      console.log("Welcome email envoyé à:", email, "ID:", response.data?.id);
      return response.data;
    } catch (error) {
      console.error("Erreur sendWelcomeEmail:", error);
      throw error;
    }
  },

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetCode: string,
    expiryMinutes: number = 60
  ) {
    try {
      const html = await render(
        PasswordResetEmail({ userName, resetCode, expiryMinutes })
      );

      const response = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: "Réinitialisez votre mot de passe Kidoo",
        html,
      });

      if (response.error) {
        console.error("Erreur lors de l'envoi du password reset email:", response.error);
        throw new Error(`Failed to send password reset email: ${response.error.message}`);
      }

      console.log("Password reset email envoyé à:", email, "ID:", response.data?.id);
      return response.data;
    } catch (error) {
      console.error("Erreur sendPasswordResetEmail:", error);
      throw error;
    }
  },

  /**
   * Envoyer une notification d'alerte
   */
  async sendNighttimeAlertEmail(
    email: string,
    userName: string,
    kidooName: string,
    alertType: "device-offline" | "device-online" | "nighttime-alert",
    appUrl: string
  ) {
    try {
      const html = await render(
        NighttimeAlertEmail({
          userName,
          kidooName,
          alertType,
          timestamp: new Date().toISOString(),
          appUrl,
        })
      );

      const subjectMap = {
        "device-offline": `🔴 ${kidooName} est hors ligne`,
        "device-online": `🟢 ${kidooName} est de retour en ligne`,
        "nighttime-alert": `🌙 Alerte sommeil - ${kidooName}`,
      };

      const response = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: subjectMap[alertType],
        html,
      });

      if (response.error) {
        console.error("Erreur lors de l'envoi de l'alerte email:", response.error);
        throw new Error(`Failed to send nighttime alert email: ${response.error.message}`);
      }

      console.log("Alert email envoyé à:", email, "ID:", response.data?.id);
      return response.data;
    } catch (error) {
      console.error("Erreur sendNighttimeAlertEmail:", error);
      throw error;
    }
  },

  /**
   * Envoyer un email de notification générique
   */
  async sendGenericEmail(
    email: string,
    subject: string,
    html: string
  ) {
    try {
      const response = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject,
        html,
      });

      if (response.error) {
        console.error("Erreur lors de l'envoi de l'email générique:", response.error);
        throw new Error(`Failed to send generic email: ${response.error.message}`);
      }

      console.log("Email générique envoyé à:", email, "ID:", response.data?.id);
      return response.data;
    } catch (error) {
      console.error("Erreur sendGenericEmail:", error);
      throw error;
    }
  },
};
