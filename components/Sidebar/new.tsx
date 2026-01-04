import {
  HomeIcon,
  ServerIcon,
  FlagIcon,
  CogIcon,
  ChartBarIcon,
  HeartIcon,
} from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";
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

interface NavigationItem {
  path: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}

export default function AppSidebar() {
  const router = useRouter();

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  const navigationItems: NavigationItem[] = [
    { path: "/", icon: HomeIcon, label: "Dashboard" },
    { path: "/timeline", icon: ChartBarIcon, label: "Timeline" },
    { path: "/impact", icon: HeartIcon, label: "Wellbeing" },
    { path: "/routines", icon: ServerIcon, label: "Routines" },
    { path: "/goals", icon: FlagIcon, label: "Goals" },
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
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            {navigationItems.map(({ path, icon: Icon, label }) => (
              <SidebarMenuItem key={path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(path)}
                  tooltip={label}
                  className="py-3 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12"
                >
                  <Link href={path} className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                    <Icon className="h-6 w-6" aria-hidden={true} />
                    <span className="group-data-[collapsible=icon]:hidden">{label}</span>
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
              <Link href="/settings" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <CogIcon className="h-6 w-6" aria-hidden={true} />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
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
