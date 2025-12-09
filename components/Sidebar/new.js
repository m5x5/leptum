import {
  CalendarIcon,
  ClockIcon,
  ServerIcon,
  FlagIcon,
  CogIcon,
  ChartBarIcon,
} from "@heroicons/react/solid";
import Link from "next/link";

export default function NewSidebar() {
  return (
    <>
      {/* Desktop Sidebar - Left side vertical */}
      <div className="hidden md:flex md:h-screen md:w-14 bg-card border-r border-border p-1 md:flex-col">
        <div className="px-4 py-1 w-12 h-12 select-none cursor-pointer">
          <Link href="/">
            <span
              className="text-foreground text-3xl"
              style={{ fontFamily: "Rye", fontWeight: "regular" }}
            >
              L
            </span>
          </Link>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center">
          <Link href="/">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <ClockIcon className="h-6" />
            </div>
          </Link>
          <Link href="/timeline">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <ChartBarIcon className="h-6" />
            </div>
          </Link>
          <Link href="/impact">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <CalendarIcon className="h-6" />
            </div>
          </Link>
          <Link href="/routines">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <ServerIcon className="h-6" />
            </div>
          </Link>
          <Link href="/goals">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <FlagIcon className="h-6" />
            </div>
          </Link>
        </div>
        <Link href="/settings">
          <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
            <CogIcon className="h-6" />
          </div>
        </Link>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex flex-row items-center justify-around px-2 py-2">
          <Link href="/">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <ClockIcon className="h-6" />
            </div>
          </Link>
          <Link href="/timeline">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <ChartBarIcon className="h-6" />
            </div>
          </Link>
          <Link href="/impact">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <CalendarIcon className="h-6" />
            </div>
          </Link>
          <Link href="/routines">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <ServerIcon className="h-6" />
            </div>
          </Link>
          <Link href="/goals">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <FlagIcon className="h-6" />
            </div>
          </Link>
          <Link href="/settings">
            <div className="text-muted-foreground p-3 hover:text-primary transition cursor-pointer">
              <CogIcon className="h-6" />
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
