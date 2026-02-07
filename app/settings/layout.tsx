import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your application preferences and data",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
