import dynamic from "next/dynamic";

const GoalsPageContent = dynamic(() => import("./GoalsPageContent"), {
  ssr: true,
});

export default function GoalsPage() {
  return (
    <div className="max-w-7xl mx-auto pt-4 pb-32 md:pb-8">
<GoalsPageContent />
    </div>
  );
}
