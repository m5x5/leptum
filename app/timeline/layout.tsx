import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Daily breakdown of your activities",
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
