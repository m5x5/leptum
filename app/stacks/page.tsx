import dynamic from "next/dynamic";

const StacksPageContent = dynamic(() => import("./StacksPageContent"), {
  ssr: true,
});

export default function StacksPage() {
  return (
    <div className="max-w-6xl mx-auto pt-4 pb-32 md:pb-8">
      <div className="flex flex-row w-full justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Stacks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize habits into themed collections
          </p>
        </div>
      </div>
      <StacksPageContent />
    </div>
  );
}
