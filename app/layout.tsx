import type { Metadata, Viewport } from "next";
import "../styles/global.css";
import "../styles/rich-text-editor.css";
import { AppShell } from "../components/AppShell";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: { default: "Leptum", template: "%s - Leptum" },
  description: "Personal productivity tracker",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
