import type { Metadata } from "next";
import HomePage from "./HomePage";

export const metadata: Metadata = {
  title: "Home",
  description: "Dashboard - tasks, routines, and quick capture",
};

export default function Page() {
  return <HomePage />;
}
