import dynamic from "next/dynamic";

const SettingsPageContent = dynamic(() => import("./SettingsPageContent"), {
  ssr: true,
});

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your application preferences and data
        </p>
      </div>
      <SettingsPageContent />
    </div>
  );
}
