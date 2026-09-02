import dynamic from "next/dynamic";
import { ExperimentGate } from "../../components/ExperimentGate";

const ImpactPageContent = dynamic(() => import("./ImpactPageContent"), {
  ssr: true,
});

export default function ImpactPage() {
  return (
    <div className="max-w-6xl mx-auto pt-4 pb-32 md:pb-8 w-full overflow-x-hidden">
      <ExperimentGate id="wellbeing">
        <ImpactPageContent />
      </ExperimentGate>
    </div>
  );
}
