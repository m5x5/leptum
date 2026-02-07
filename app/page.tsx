import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const HomePageContent = dynamic(() => import("../components/HomePageContent"), {
  ssr: true,
});

export const metadata: Metadata = {
  title: "Home",
  description: "Dashboard - tasks, routines, and quick capture",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
