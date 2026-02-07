import dynamic from "next/dynamic";

const GoalsPageContent = dynamic(() => import("./GoalsPageContent"), {
  ssr: true,
});

export default function GoalsPage() {
  return (
    <div className="max-w-7xl mx-auto pt-4 pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your objectives and organize them by category
        </p>
      </div>
      <GoalsPageContent />
    </div>
  );
}
