import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Where Leptum stores your data: your Solid pod, what lives in which container, and what stays on this device",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
