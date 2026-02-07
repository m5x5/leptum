import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stats",
  description: "Track your progress and what helps your wellbeing",
  alternates: { canonical: "/insights" },
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
