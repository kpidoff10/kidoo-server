/**
 * URLs pour les emails
 * Définit les URLs de base pour les liens dans les emails
 */

export const getBaseUrl = () => {
  // En production, utilise NEXTAUTH_URL ou la variable d'environnement
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // En développement
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // Fallback
  return "https://kidoo.app";
};

export const getLoginUrl = () => {
  return `${getBaseUrl()}/login`;
};

export const getPasswordResetUrl = (token: string) => {
  return `${getBaseUrl()}/reset-password?token=${token}`;
};

export const getAppUrl = () => {
  return `${getBaseUrl()}/dashboard`;
};

export const getDeviceManagementUrl = (deviceId: string) => {
  return `${getBaseUrl()}/devices/${deviceId}`;
};

export const emailConfig = {
  /**
   * Email source - doit être un domaine vérifié dans Resend
   */
  fromEmail: process.env.EMAIL_FROM || "noreply@kidoo.app",

  /**
   * Nom d'affichage de l'email
   */
  fromName: "Kidoo",

  /**
   * Email support
   */
  supportEmail: "support@kidoo.app",

  /**
   * Adresses de test (développement)
   */
  testEmail: process.env.EMAIL_TEST || "delivered@resend.dev",
};
