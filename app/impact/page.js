import dynamic from "next/dynamic";

const ImpactPageContent = dynamic(() => import("./ImpactPageContent"), {
  ssr: true,
});

export default function ImpactPage() {
  return (
    <div className="max-w-6xl mx-auto pt-4 pb-32 md:pb-8 w-full overflow-x-hidden">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Wellbeing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your mood and discover what helps
          </p>
        </div>
      </div>
      <ImpactPageContent />
    </div>
  );
}
