import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debug Patterns",
  description: "Pattern analysis debug view",
};

export default function DebugPatternsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
