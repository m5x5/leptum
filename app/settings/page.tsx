"use client";

import dynamic from "next/dynamic";

const SettingsPageContent = dynamic(() => import("./SettingsPageContent"), {
  ssr: false,
});

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
<SettingsPageContent />
    </div>
  );
}
