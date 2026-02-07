import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stacks",
  description: "Organize habits into themed collections",
  alternates: { canonical: "/stacks" },
};

export default function StacksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
