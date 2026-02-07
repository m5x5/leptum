import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals",
  description: "Track your objectives and organize them by category",
};

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
