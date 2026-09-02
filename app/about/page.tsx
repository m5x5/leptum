import dynamic from "next/dynamic";

const AboutPageContent = dynamic(() => import("./AboutPageContent"), {
  ssr: true,
});

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32 md:pb-8">
      <AboutPageContent />
    </div>
  );
}
