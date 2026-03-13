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

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiryMinutes?: number;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
  expiryMinutes = 60,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Réinitialisez votre mot de passe Kidoo</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🌙 Kidoo</Text>
          </Section>

          {/* Contenu principal */}
          <Section style={content}>
            <Text style={greeting}>Salut {userName},</Text>

            <Text style={text}>
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
            </Text>

            {/* Warning */}
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ Ce lien expire dans <strong>{expiryMinutes} minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Réinitialiser mon mot de passe
              </Button>
            </Section>

            <Hr style={hr} />

            {/* Alternative */}
            <Text style={alternativeText}>
              Ou copiez ce lien dans votre navigateur:
            </Text>
            <Text style={urlText}>{resetUrl}</Text>

            <Hr style={hr} />

            {/* Security note */}
            <Text style={securityText}>
              <strong>Conseil de sécurité:</strong> Ne partagez jamais ce lien avec quiconque. Kidoo ne vous demandera jamais votre mot de passe par e-mail.
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
                Besoin d'aide?
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

const content = {
  padding: "32px 20px",
};

const greeting = {
  fontSize: "20px",
  lineHeight: "1.3",
  fontWeight: "bold",
  margin: "16px 0",
  color: "#000",
};

const text = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#525252",
  margin: "16px 0",
};

const warningBox = {
  backgroundColor: "#fff3cd",
  borderLeft: "4px solid #ffc107",
  padding: "12px 16px",
  margin: "16px 0",
  borderRadius: "4px",
};

const warningText = {
  fontSize: "13px",
  color: "#856404",
  margin: "0",
};

const buttonContainer = {
  padding: "27px 0",
};

const button = {
  backgroundColor: "#d32f2f",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
  margin: "0 auto",
  width: "fit-content",
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "20px 0",
};

const alternativeText = {
  fontSize: "12px",
  color: "#666",
  marginTop: "16px",
  marginBottom: "8px",
};

const urlText = {
  fontSize: "11px",
  color: "#0066cc",
  wordBreak: "break-all" as const,
  fontFamily: "monospace",
  padding: "8px",
  backgroundColor: "#f5f5f5",
  borderRadius: "4px",
};

const securityText = {
  fontSize: "12px",
  color: "#666",
  padding: "12px",
  backgroundColor: "#f9f9f9",
  borderRadius: "4px",
  margin: "16px 0",
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
