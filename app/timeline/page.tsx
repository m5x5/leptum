import { Suspense } from "react";
import TimelinePageContent from "./TimelinePageContent";

export default function TimelinePage() {
  return (
    <div className="w-full mx-auto pt-4 pb-32 md:pb-8">
      <Suspense fallback={null}>
        <TimelinePageContent />
      </Suspense>
    </div>
  );
}
