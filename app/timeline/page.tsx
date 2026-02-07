import dynamic from "next/dynamic";

const TimelinePageContent = dynamic(() => import("./TimelinePageContent"), {
  ssr: true,
});

export default function TimelinePage() {
  return (
    <div className="w-full mx-auto pt-4 pb-32 md:pb-8">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily breakdown of your activities
            </p>
          </div>
        </div>
      </div>
      <TimelinePageContent />
    </div>
  );
}
