import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Routines",
  description: "Manage your routines and tasks - add schedules optionally",
};

export default function RoutinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
