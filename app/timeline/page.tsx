import dynamic from "next/dynamic";

const TimelinePageContent = dynamic(() => import("./TimelinePageContent"), {
  ssr: true,
});

export default function TimelinePage() {
  return (
    <div className="w-full mx-auto pt-4 pb-32 md:pb-8">
      <TimelinePageContent />
    </div>
  );
}
