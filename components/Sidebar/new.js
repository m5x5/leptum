import {
  CalendarIcon,
  ClockIcon,
  ServerIcon,
  FlagIcon,
  CogIcon,
  ChartBarIcon,
  MenuIcon,
  XIcon,
} from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

export default function NewSidebar() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarExpanded");
    if (savedState !== null) {
      setIsExpanded(savedState === "true");
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarExpanded", String(isExpanded));
  }, [isExpanded]);

  const isActive = (path) => {
    return router.pathname === path;
  };

  const getLinkClasses = (path) => {
    return isActive(path)
      ? "text-primary bg-primary/10 p-3 rounded-lg transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      : "text-muted-foreground p-3 hover:text-primary transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background";
  };

  const navigationItems = [
    { path: "/", icon: ClockIcon, label: "Dashboard" },
    { path: "/timeline", icon: ChartBarIcon, label: "Timeline" },
    { path: "/impact", icon: CalendarIcon, label: "Impact" },
    { path: "/routines", icon: ServerIcon, label: "Routines" },
    { path: "/goals", icon: FlagIcon, label: "Goals" },
  ];

  return (
    <>
      {/* Desktop Sidebar - Left side vertical */}
      <nav
        className={`hidden md:flex md:h-screen bg-card border-r border-border p-1 md:flex-col flex-shrink-0 transition-all duration-300 ${
          isExpanded ? "md:w-48" : "md:w-14"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-2 py-1 h-12">
          <Link
            href="/"
            className="select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
            aria-label="Home - Leptum"
          >
            <span
              className="text-foreground text-3xl"
              style={{ fontFamily: "Rye", fontWeight: "regular" }}
              aria-hidden="true"
            >
              L
            </span>
          </Link>
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Collapse sidebar"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 mx-auto my-2 rounded-lg hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Expand sidebar"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        )}

        <div className="flex-grow flex flex-col items-stretch justify-center space-y-1">
          {navigationItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              href={path}
              className={`${getLinkClasses(path)} flex items-center ${
                isExpanded ? "justify-start space-x-3" : "justify-center"
              }`}
              aria-label={label}
              aria-current={isActive(path) ? "page" : undefined}
            >
              <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
              {isExpanded && <span className="text-sm font-medium">{label}</span>}
            </Link>
          ))}
        </div>

        <Link
          href="/settings"
          className={`${getLinkClasses("/settings")} flex items-center ${
            isExpanded ? "justify-start space-x-3" : "justify-center"
          }`}
          aria-label="Settings"
          aria-current={isActive("/settings") ? "page" : undefined}
        >
          <CogIcon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
          {isExpanded && <span className="text-sm font-medium">Settings</span>}
        </Link>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        aria-label="Main navigation"
      >
        <div className="flex flex-row items-center justify-around px-2 py-2">
          {navigationItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              href={path}
              className={getLinkClasses(path)}
              aria-label={label}
              aria-current={isActive(path) ? "page" : undefined}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
            </Link>
          ))}
          <Link
            href="/settings"
            className={getLinkClasses("/settings")}
            aria-label="Settings"
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <CogIcon className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </>
  );
}
