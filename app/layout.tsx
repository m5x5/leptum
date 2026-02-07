import type { Metadata, Viewport } from "next";
import "../styles/global.css";
import "../styles/rich-text-editor.css";
import { AppShell } from "../components/AppShell";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leptum.mpeters.dev";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: "Leptum", template: "%s - Leptum" },
  description: "Personal productivity tracker with local-first, user-owned data storage.",
  manifest: "/manifest.json",
  icons: {
    icon: ["/favicon.ico", { type: "image/svg+xml", url: "/icon.svg" }],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Leptum",
  },
  openGraph: {
    type: "website",
    locale: "en",
    siteName: "Leptum",
    title: "Leptum - Personal productivity tracker",
    description: "Local-first productivity tracker. Tasks, routines, goals, and wellbeing logging with user-owned data.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leptum - Personal productivity tracker",
    description: "Local-first productivity tracker with user-owned data.",
  },
  alternates: {
    canonical: "/",
  },
};

const authorSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Michael Peters",
  url: "https://github.com/m5x5",
  description: "Independent developer",
};

const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Leptum",
  url: baseUrl,
  description: "Local-first personal productivity tracker. Track tasks, routines, goals, and wellbeing with data you own.",
  applicationCategory: "ProductivityApplication",
  author: { "@id": "#author" },
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ ...authorSchema, "@id": "#author" }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webApplicationSchema),
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
