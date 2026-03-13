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

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export const WelcomeEmail = ({ userName, loginUrl }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur Kidoo! 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🌙 Kidoo</Text>
            <Text style={tagline}>Éclairez les rêves de vos enfants</Text>
          </Section>

          {/* Contenu principal */}
          <Section style={content}>
            <Text style={greeting}>Salut {userName}! 👋</Text>

            <Text style={text}>
              Bienvenue dans la famille Kidoo! Nous sommes ravis de vous compter parmi nous.
            </Text>

            <Text style={text}>
              Votre compte a été créé avec succès. Connectez-vous maintenant pour commencer à explorer les fonctionnalités magiques de Kidoo.
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Se connecter à mon compte
              </Button>
            </Section>

            <Hr style={hr} />

            {/* Info supplémentaire */}
            <Text style={infoBox}>
              <strong>💡 Conseil:</strong> Installez l'app Kidoo sur votre téléphone pour la meilleure expérience!
            </Text>

            <Text style={text}>
              Des questions? Notre équipe est là pour vous aider.
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
              <Link href="https://kidoo.app/privacy" style={link}>
                Politique de confidentialité
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
  margin: "0 0 8px 0",
};

const tagline = {
  fontSize: "14px",
  color: "#666",
  margin: "0",
};

const content = {
  padding: "32px 20px",
};

const greeting = {
  fontSize: "24px",
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

const buttonContainer = {
  padding: "27px 0",
};

const button = {
  backgroundColor: "#5469d4",
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

const infoBox = {
  fontSize: "13px",
  color: "#666",
  padding: "12px 16px",
  backgroundColor: "#f3f3f3",
  borderRadius: "4px",
  display: "block",
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
