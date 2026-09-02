import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Spinner } from "../../../components/ui/spinner";
import { ExperimentGate } from "../../../components/ExperimentGate";

const DayViewContent = dynamic(() => import("./DayViewContent"), {
  ssr: true,
});

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return (
    <div className="w-full mx-auto h-full pb-32 md:pb-8">
      <ExperimentGate id="dayView">
        <Suspense fallback={<div className="p-8 flex justify-center"><Spinner className="h-6 w-6 text-muted-foreground" /></div>}>
          <DayViewContent date={date} />
        </Suspense>
      </ExperimentGate>
    </div>
  );
}
