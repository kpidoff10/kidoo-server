import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Évite le prerender de _global-error qui échoue en monorepo (useContext null)
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kidoo - Veilleuse intelligente pour enfants",
  description: "Kidoo est une veilleuse intelligente connectée qui accompagne les enfants au coucher et au réveil avec des routines personnalisables, des effets lumineux apaisants et bien plus encore.",
  keywords: ["veilleuse", "enfants", "routines", "sommeil", "domotique", "intelligente"],
  authors: [{ name: "Kidoo Team" }],
  creator: "Kidoo",
  openGraph: {
    title: "Kidoo - Veilleuse intelligente pour enfants",
    description: "Découvrez Kidoo : la veilleuse intelligente qui simplifie les routines de vos enfants.",
    type: "website",
    locale: "fr_FR",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
