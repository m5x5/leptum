import dynamic from "next/dynamic";

const RoutinesPageContent = dynamic(() => import("./RoutinesPageContent"), {
  ssr: true,
});

export default function RoutinesPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
<RoutinesPageContent />
    </div>
  );
}
