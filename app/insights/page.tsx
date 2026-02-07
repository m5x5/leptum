import dynamic from "next/dynamic";

const InsightsPageContent = dynamic(() => import("./InsightsPageContent"), {
  ssr: true,
});

export default function InsightsPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Stats</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your progress and what helps your wellbeing
        </p>
      </div>
      <InsightsPageContent />
    </div>
  );
}
