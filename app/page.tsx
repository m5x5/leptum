import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ApplicationCapabilityRdfa } from "../components/homepage/ApplicationCapabilityRdfa";

const LandingPageContent = dynamic(() => import("../components/homepage/LandingPageContent"), {
  ssr: true,
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leptum.mpeters.dev";

export const metadata: Metadata = {
  title: "Leptum",
  description: "Local-first productivity tracker with user-owned data storage.",
};

export default function Page() {
  return <LandingPageContent capabilityFooter={<ApplicationCapabilityRdfa origin={baseUrl} />} />;
}
