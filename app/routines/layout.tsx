import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Routines",
  description: "Routines and tasks, with optional schedules",
  alternates: { canonical: "/routines" },
};

export default function RoutinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
