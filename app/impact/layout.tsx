import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wellbeing",
  description: "Track your mood and discover what helps",
};

export default function ImpactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
