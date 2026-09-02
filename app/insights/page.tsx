import dynamic from "next/dynamic";

const InsightsPageContent = dynamic(() => import("./InsightsPageContent"), {
  ssr: true,
});

export default function InsightsPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
<InsightsPageContent />
    </div>
  );
}
