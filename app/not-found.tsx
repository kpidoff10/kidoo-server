import Link from "next/link";

/**
 * Page 404 - Server Component uniquement (pas de hooks ni contexte)
 * Évite les erreurs de prerender "useContext" avec le not-found par défaut
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>Page introuvable</h1>
      <p style={{ marginBottom: "24px", color: "#666" }}>
        La page que vous recherchez n&apos;existe pas.
      </p>
      <Link
        href="/"
        style={{
          padding: "8px 16px",
          backgroundColor: "#6366F1",
          color: "white",
          borderRadius: "4px",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
