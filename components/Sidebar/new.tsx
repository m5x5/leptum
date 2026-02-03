import {
  HomeIcon,
  ServerIcon,
  FlagIcon,
  CogIcon,
  ChartBarIcon,
  HeartIcon,
} from "@heroicons/react/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  // usePathname() works in App Router; in Pages Router use window.location on client
  useEffect(() => {
    if (typeof window !== "undefined") setClientPathname(window.location.pathname);
  }, []);
  const pathname = pathnameFromApp ?? clientPathname;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowKeyboardHints(likelyWithKeyboard(window));
    }
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navigationItems: NavigationItem[] = [
    { path: "/", icon: HomeIcon, label: "Dashboard", shortcut: "d" },
    { path: "/timeline", icon: ChartBarIcon, label: "Timeline", shortcut: "t" },
    { path: "/impact", icon: HeartIcon, label: "Wellbeing", shortcut: "w" },
    { path: "/routines", icon: ServerIcon, label: "Routines", shortcut: "r" },
    { path: "/goals", icon: FlagIcon, label: "Goals", shortcut: "g" },
  ];

  return (
    <>
      {/* Desktop Sidebar - shadcn */}
      <Sidebar collapsible="icon" variant="sidebar" className="hidden md:flex" style={{ viewTransitionName: 'sidebar' } as any}>
      <SidebarHeader>
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12">
              <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <div className="flex aspect-square h-8 w-8 items-center justify-center">
                  <span
                    className="text-foreground text-2xl"
                    style={{ fontFamily: "Rye", fontWeight: "normal" }}
                  >
                    L
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Leptum</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Productivity Tracker
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center space-y-1">
            {navigationItems.map(({ path, icon: Icon, label, shortcut }) => (
              <SidebarMenuItem key={path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(path)}
                  tooltip={label}
                  className="py-3 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12"
                >
                  <Link 
                    href={path} 
                    aria-keyshortcuts={shortcut}
                    className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
                  >
                    <Icon className="h-6 w-6" aria-hidden={true} />
                    <span className="group-data-[collapsible=icon]:hidden flex items-center gap-2">
                      {label}
                      {showKeyboardHints && shortcut && typeof window !== 'undefined' && (
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                          {getHotKeyHint(window, shortcut)}
                        </kbd>
                      )}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings" className="py-3 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12">
              <Link 
                href="/settings" 
                aria-keyshortcuts="s"
                className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
              >
                <CogIcon className="h-6 w-6" aria-hidden={true} />
                <span className="group-data-[collapsible=icon]:hidden flex items-center gap-2">
                  Settings
                  {showKeyboardHints && typeof window !== 'undefined' && (
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                      {getHotKeyHint(window, 's')}
                    </kbd>
                  )}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Mobile Bottom Navigation - Material You Style */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 shadow-lg"
        style={{ viewTransitionName: 'bottom-bar' } as any}
        aria-label="Main navigation"
      >
        <div className="flex flex-row items-center justify-around px-1 py-1.5">
          {navigationItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              href={path}
              className={cn(
                "cursor-pointer focus:outline-none flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[64px]",
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
              "cursor-pointer focus:outline-none flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[64px]",
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
