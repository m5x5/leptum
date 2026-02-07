import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-foreground">Not Found</h2>
      <p className="text-muted-foreground">Could not find the requested resource.</p>
      <Link
        href="/"
        className="text-primary hover:underline"
      >
        Return Home
      </Link>
    </div>
  );
}
