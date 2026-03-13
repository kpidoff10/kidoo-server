import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface NighttimeAlertEmailProps {
  userName: string;
  kidooName: string;
  alertType: "device-offline" | "device-online" | "nighttime-alert";
  timestamp: string;
  appUrl: string;
}

export const NighttimeAlertEmail = ({
  userName,
  kidooName,
  alertType,
  timestamp,
  appUrl,
}: NighttimeAlertEmailProps) => {
  const getAlertContent = () => {
    switch (alertType) {
      case "device-offline":
        return {
          icon: "🔴",
          title: `${kidooName} est hors ligne`,
          description: `Le device de ${kidooName} a perdu la connexion. Vérifiez la connexion WiFi de l'appareil.`,
          color: "#d32f2f",
        };
      case "device-online":
        return {
          icon: "🟢",
          title: `${kidooName} est de retour en ligne`,
          description: `${kidooName} s'est reconnecté avec succès.`,
          color: "#388e3c",
        };
      case "nighttime-alert":
        return {
          icon: "🌙",
          title: `Alerte sommeil - ${kidooName}`,
          description: `${kidooName} a déclenché l'alerte de sommeil. Consultez l'application pour plus de détails.`,
          color: "#5469d4",
        };
      default:
        return {
          icon: "📱",
          title: "Notification Kidoo",
          description: "Vous avez une nouvelle notification.",
          color: "#666",
        };
    }
  };

  const alert = getAlertContent();

  return (
    <Html>
      <Head />
      <Preview>{alert.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🌙 Kidoo</Text>
          </Section>

          {/* Alert Box */}
          <Section style={{ ...alertBox, borderLeftColor: alert.color }}>
            <Text style={alertIcon}>{alert.icon}</Text>
            <Text style={alertTitle}>{alert.title}</Text>
            <Text style={alertDescription}>{alert.description}</Text>
            <Text style={timestampText}>
              {new Date(timestamp).toLocaleString("fr-FR")}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={{ ...button, backgroundColor: alert.color }} href={appUrl}>
              Voir dans l'application
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Info */}
          <Section style={content}>
            <Text style={infoText}>
              Vous recevez cet e-mail car vous avez activé les notifications pour {kidooName}.
            </Text>
            <Text style={infoText}>
              Vous pouvez gérer vos préférences de notification dans les paramètres de l'application.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={hr} />
            <Text style={footerText}>
              © 2026 Kidoo. Tous droits réservés.
            </Text>
            <Text style={footerText}>
              <Link href="https://kidoo.app/support" style={link}>
                Contactez le support
              </Link>
              {" • "}
              <Link href="https://kidoo.app/notifications" style={link}>
                Gérer les notifications
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  textAlign: "center" as const,
  padding: "32px 0",
  borderBottom: "1px solid #e5e5e5",
};

const logo = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#000",
  margin: "0",
};

const alertBox = {
  borderLeft: "4px solid #5469d4",
  padding: "20px",
  margin: "24px 0",
  backgroundColor: "#f9f9f9",
  borderRadius: "4px",
};

const alertIcon = {
  fontSize: "32px",
  margin: "0 0 12px 0",
  display: "block",
};

const alertTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#000",
  margin: "12px 0 8px 0",
};

const alertDescription = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#525252",
  margin: "8px 0",
};

const timestampText = {
  fontSize: "12px",
  color: "#999",
  margin: "12px 0 0 0",
  fontStyle: "italic" as const,
};

const buttonContainer = {
  padding: "20px 0",
  textAlign: "center" as const,
};

const button = {
  borderRadius: "6px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "10px 20px",
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "20px 0",
};

const content = {
  padding: "20px",
};

const infoText = {
  fontSize: "12px",
  color: "#666",
  margin: "8px 0",
  lineHeight: "18px",
};

const footer = {
  padding: "24px 20px",
};

const footerText = {
  fontSize: "12px",
  color: "#666",
  margin: "8px 0",
  textAlign: "center" as const,
};

const link = {
  color: "#5469d4",
  textDecoration: "underline",
};
