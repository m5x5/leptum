import {
  HomeIcon,
  ServerIcon,
  FlagIcon,
  CogIcon,
  ChartBarIcon,
  HeartIcon,
  ShieldCheckIcon,
  EyeIcon,
} from "@heroicons/react/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "../ui/sidebar";
import { cn } from "../../lib/utils";
import { getHotKeyHint, likelyWithKeyboard } from "keyux";
import { SidebarNavDialKit } from "../SidebarNavDialKit";
import { FocusTimer } from "../../app/day/[date]/ADHDFeatures";
import { useCurrentActivity } from "../CurrentActivityContext";
import { LiveDuration } from "../ui/live-duration";
import { HighlightedMentions } from "../ui/mention-input";
import { experimentForPath, useEnabledExperiments } from "../../lib/experiments";

interface NavigationItem {
  path: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  shortcut?: string;
}

export default function AppSidebar() {
  const pathnameFromApp = usePathname();
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [clientPathname, setClientPathname] = useState("");
  const currentActivity = useCurrentActivity();
  const { enabled: enabledExperiments } = useEnabledExperiments();

  // usePathname() works in App Router; in Pages Router use window.location on client
  useEffect(() => {
    if (typeof window !== "undefined") queueMicrotask(() => setClientPathname(window.location.pathname));
  }, []);
  const pathname = pathnameFromApp ?? clientPathname;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      queueMicrotask(() => {
        const stored = localStorage.getItem('showKeyboardShortcuts');
        setShowKeyboardHints(stored !== null ? stored === 'true' : false);
      });
      const handleChange = () => {
        const stored = localStorage.getItem('showKeyboardShortcuts');
        setShowKeyboardHints(stored !== null ? stored === 'true' : false);
      };
      window.addEventListener('keyboardShortcutsChanged', handleChange);
      return () => window.removeEventListener('keyboardShortcutsChanged', handleChange);
    }
  }, []);


  const isActive = (path: string) => {
    if (path.startsWith("/day/")) return pathname?.startsWith("/day/") ?? false;
    return pathname === path;
  };

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const dayViewDate = pathname?.startsWith("/day/") ? pathname.split("/")[2] || todayDateStr : todayDateStr;

  const navigationItems: NavigationItem[] = [
    { path: "/app", icon: HomeIcon, label: "Home", shortcut: "d" },
    { path: "/timeline", icon: ChartBarIcon, label: "Timeline", shortcut: "t" },
    { path: "/impact", icon: HeartIcon, label: "Wellbeing", shortcut: "w" },
    { path: "/routines", icon: ServerIcon, label: "Routines", shortcut: "r" },
    { path: "/goals", icon: FlagIcon, label: "Goals", shortcut: "g" },
    { path: `/day/${todayDateStr}`, icon: EyeIcon, label: "Day View", shortcut: "y" },
    { path: "/health", icon: ShieldCheckIcon, label: "Health", shortcut: "h" },
  ].filter(({ path }) => {
    // Experimental features stay out of the nav until enabled in Settings › Experiments.
    const experiment = experimentForPath(path);
    return !experiment || enabledExperiments.has(experiment.id);
  });

  return (
    <>
      {/* Desktop Sidebar - shadcn (DialKit: Navbar items) */}
      <SidebarNavDialKit>
      <Sidebar collapsible="icon" variant="sidebar" className="hidden md:flex" style={{ viewTransitionName: 'sidebar' } as React.CSSProperties & { viewTransitionName?: string }}>
      <SidebarHeader>
        <div className="flex items-center">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="!overflow-visible group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                <Link href="/app" className="flex items-center gap-2 overflow-visible">
                  <div
                    className="flex aspect-square h-9 w-9 items-center justify-center overflow-hidden shrink-0"
                    style={{
                      viewTransitionName: 'sidebar-logo',
                      backgroundColor: '#151e37',
                      borderRadius: '24%',
                      boxShadow: '0 8px 14px -6px rgba(0, 0, 0, 0.25)',
                    } as React.CSSProperties}
                  >
                    <svg
                      viewBox="0 0 428 428"
                      aria-hidden="true"
                      className="h-[78%] w-[78%]"
                    >
                      <path
                        d="M178.571 324.286C172.285 324.286 166.714 322.762 161.857 319.714C157 322.762 152.476 324.286 148.285 324.286C144.19 324.286 140.809 323.905 138.143 323.143C135.476 322.476 133.143 321.524 131.143 320.286C127.048 317.809 125 314.714 125 311C125 309.095 125.523 307.429 126.571 306C128.666 307.619 131.333 308.428 134.571 308.428C143.048 308.428 148.904 304.81 152.142 297.571V227.714C152.142 223.333 151.238 220.095 149.428 218C146.571 214.476 141.667 211 134.714 207.572C141.19 204.619 145.381 202 147.286 199.714C150.524 196 152.142 191.809 152.142 187.143V126.857C148.904 119.524 143.048 115.857 134.571 115.857C131.333 115.857 128.666 116.667 126.571 118.286C125.523 116.857 125 115.238 125 113.429C125 111.524 125.523 109.762 126.571 108.143C127.714 106.524 129.238 105.143 131.143 104C135.523 101.333 140.524 100 146.143 100C151.857 100 157.095 101.571 161.857 104.715C166.809 101.571 172.333 100 178.428 100C184.524 100 190.047 101.571 195 104.715C200.333 101.571 205.19 100 209.571 100C213.952 100 217.476 100.381 220.142 101.143C222.809 101.809 225.143 102.762 227.143 104C231.238 106.476 233.285 109.571 233.285 113.286C233.285 115.19 232.762 116.857 231.714 118.286C229.619 116.667 226.809 115.857 223.286 115.857C219.762 115.857 216.19 116.81 212.571 118.714C209.048 120.524 206.428 123.285 204.714 127V187.143C204.714 191.809 205.714 195.285 207.714 197.571C210.857 201.286 215.667 204.619 222.143 207.572C215.19 211 210.762 213.809 208.857 216C206.095 219.429 204.714 223.333 204.714 227.714V290.143C211 300.143 218.857 305.143 228.285 305.143C251.619 305.143 266.619 295.238 273.285 275.429C276.238 266.667 277.714 258.667 277.714 251.429C277.714 244.095 276.714 239.19 274.714 236.715C276.904 234.905 279.143 234 281.428 234C283.809 234 286 234.476 288 235.429C290 236.381 291.809 237.809 293.428 239.714C296.762 243.619 298.428 248.238 298.428 253.571C298.428 258.905 298 263 297.143 265.857C301.523 269.476 303.714 274.571 303.714 281.143C303.714 287.714 301.857 293.048 298.143 297.143C301.285 301.143 302.857 304.762 302.857 308C302.857 311.238 302.381 314.048 301.428 316.428C300.571 318.714 299.333 320.762 297.714 322.571C294.095 326.286 289.762 328.143 284.714 328.143C282.238 328.143 279.952 327.619 277.857 326.571C278.238 324.476 278.428 322.381 278.428 320.286C278.428 315.905 276.429 313.714 272.429 313.714C269.476 313.714 265.381 314.905 260.142 317.286C250.047 321.952 238.524 324.286 225.571 324.286C212.714 324.286 202.666 322.619 195.428 319.285C190.476 322.619 184.857 324.286 178.571 324.286ZM165.857 283.572C170.619 281.762 173.238 275.524 173.714 264.857C174.285 254.191 174.571 239.429 174.571 220.571C174.571 201.714 174.524 189.19 174.428 183C174.428 176.715 174.381 171.667 174.285 167.857C174 156.619 172.904 149.857 171 147.572C169.19 145.19 167.476 143.619 165.857 142.857C165.857 176 165.285 194.857 164.142 199.429C162.809 203.238 159.571 205.952 154.428 207.572C160.142 209.571 163.381 212 164.142 214.857C165.285 219.429 165.857 236.143 165.857 265V283.572Z"
                        fill="#ffffff"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-1 items-center min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold text-foreground">Leptum</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarMenu className="space-y-1">
            {navigationItems.map(({ path, icon: Icon, label, shortcut }) => (
              <SidebarMenuItem key={path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(path)}
                  tooltip={label}
                  className="py-3 pl-3.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:!px-3 data-[active=true]:cursor-default"
                >
                  <Link
                    href={path}
                    aria-keyshortcuts={shortcut}
                    className="flex items-center"
                  >
                    <Icon className="h-6 w-6 shrink-0" aria-hidden={true} />
                    <span className="grid overflow-hidden transition-[grid-template-columns,opacity] duration-300 ease-in-out [grid-template-columns:1fr] opacity-100 group-data-[collapsible=icon]:[grid-template-columns:0fr] group-data-[collapsible=icon]:opacity-0">
                      <span className="min-w-0 pl-2 flex items-center gap-2">
                        {label}
                        {showKeyboardHints && shortcut && typeof window !== 'undefined' && (
                          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded shrink-0">
                            {getHotKeyHint(window, shortcut)}
                          </kbd>
                        )}
                      </span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="gap-0">
        <div className="group-data-[collapsible=icon]:hidden">
          {currentActivity && (
            <div className="border border-border border-b-0 bg-primary/10 rounded-card rounded-b-none p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-normal text-primary truncate min-w-0">
                  <HighlightedMentions
                    text={currentActivity.name}
                    mentionClassName="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium"
                  />
                </span>
                <span className="text-sm font-medium text-primary shrink-0">
                  <LiveDuration startTime={currentActivity.startTime} />
                </span>
              </div>
            </div>
          )}
          <FocusTimer
            date={dayViewDate}
            className={cn("rounded-b-none border-b-0", currentActivity && "rounded-t-none border-t-0")}
          />
        </div>
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/settings")}
              tooltip="Settings"
              className={cn(
                "py-3 pl-3.5 border border-border group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:!px-3 data-[active=true]:cursor-default",
                "rounded-t-none rounded-b-[1.5rem] group-data-[collapsible=icon]:rounded-full"
              )}
            >
              <Link
                href="/settings"
                aria-keyshortcuts="s"
                className="flex items-center"
              >
                <CogIcon className="h-6 w-6 shrink-0" aria-hidden={true} />
                <span className="grid overflow-hidden transition-[grid-template-columns,opacity] duration-300 ease-in-out [grid-template-columns:1fr] opacity-100 group-data-[collapsible=icon]:[grid-template-columns:0fr] group-data-[collapsible=icon]:opacity-0">
                  <span className="min-w-0 pl-2 flex items-center gap-2">
                    <span className="truncate">Settings</span>
                    {showKeyboardHints && typeof window !== 'undefined' && (
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded shrink-0">
                        {getHotKeyHint(window, 's')}
                      </kbd>
                    )}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

        <SidebarRail />
      </Sidebar>
      </SidebarNavDialKit>

      {/* Mobile Bottom Navigation - Material You Style */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 shadow-lg overscroll-none"
        style={{ viewTransitionName: 'bottom-bar' } as React.CSSProperties & { viewTransitionName?: string }}
        aria-label="Main navigation"
      >
        <div className="flex flex-row items-center justify-around px-1 py-1.5">
          {navigationItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              href={path}
              className={cn(
                "cursor-pointer focus:outline-none flex flex-col items-center justify-center gap-1 px-2 py-2 min-h-[44px] min-w-[44px]",
                isActive(path) ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
              aria-label={label}
              aria-current={isActive(path) ? "page" : undefined}
            >
              <div
                className={cn(
                  "px-4 py-1.5 flex items-center justify-center",
                  isActive(path) && "bg-primary/10 rounded-full"
                )}
              >
                <Icon className="h-6 w-6 flex-shrink-0" aria-hidden={true} />
              </div>
              <span className="text-xs font-medium truncate max-w-[64px]">{label}</span>
            </Link>
          ))}
          <Link
            href="/settings"
            className={cn(
              "cursor-pointer focus:outline-none flex flex-col items-center justify-center gap-1 px-2 py-2 min-h-[44px] min-w-[44px]",
              isActive("/settings") ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
            aria-label="Settings"
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <div
              className={cn(
                "px-4 py-1.5 flex items-center justify-center",
                isActive("/settings") && "bg-primary/10 rounded-full"
              )}
            >
              <CogIcon className="h-6 w-6 flex-shrink-0" aria-hidden={true} />
            </div>
            <span className="text-xs font-medium truncate max-w-[64px]">Settings</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
