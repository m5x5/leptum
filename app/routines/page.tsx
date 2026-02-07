import dynamic from "next/dynamic";

const RoutinesPageContent = dynamic(() => import("./RoutinesPageContent"), {
  ssr: true,
});

export default function RoutinesPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
      <div className="flex flex-row w-full justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Routines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your routines and tasks - add schedules optionally
          </p>
        </div>
      </div>
      <RoutinesPageContent />
    </div>
  );
}
