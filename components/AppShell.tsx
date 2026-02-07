"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { JobContextProvider } from "./Job/Context";
import AppSidebar from "./Sidebar/new";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { PlusIcon } from "@heroicons/react/solid";
import { startKeyUX, hotkeyKeyUX, pressKeyUX, getHotKeyHint, likelyWithKeyboard } from "keyux";
import { CurrentActivityContext } from "./CurrentActivityContext";
import { StandaloneTasksProvider } from "./StandaloneTasksContext";
import { remoteStorageClient } from "../lib/remoteStorage";
import { serviceWorkerManager, isOfflineModeEnabled } from "../utils/serviceWorker";
import { Toaster } from "sonner";
// Run migration when app router bundle loads
import "../utils/migrateGoalIdToGoalIds";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePath = pathname?.split("?")[0].split("#")[0] ?? "/";
  const [mounted, setMounted] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<{
    name: string;
    startTime: number;
    goalId?: string;
  } | null>(null);

  // Load current activity for tracking pill in header (home only)
  useEffect(() => {
    const loadCurrentActivity = async () => {
      if (activePath !== "/") {
        setCurrentActivity(null);
        return;
      }

      try {
        const impacts = await remoteStorageClient.getImpacts();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayImpacts = impacts.filter((impact: { date: number }) => impact.date >= todayStart.getTime());
        todayImpacts.sort((a: { date: number }, b: { date: number }) => a.date - b.date);

        if (todayImpacts.length > 0) {
          const lastImpact = todayImpacts[todayImpacts.length - 1];
          setCurrentActivity({
            name: lastImpact.activity,
            startTime: lastImpact.date,
            goalId: lastImpact.goalId,
          });
        } else {
          setCurrentActivity(null);
        }
      } catch (error) {
        console.error("Failed to load current activity:", error);
      }
    };

    loadCurrentActivity();

    const handleImpactChange = () => {
      loadCurrentActivity();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("impactsUpdated", handleImpactChange);
      return () => {
        window.removeEventListener("impactsUpdated", handleImpactChange);
      };
    }
  }, [activePath]);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      if (typeof window !== "undefined") {
        setShowKeyboardHints(likelyWithKeyboard(window));
      }
    });
    if (typeof window !== "undefined") {
      const stopKeyUX = startKeyUX(window, [hotkeyKeyUX(), pressKeyUX("is-pressed")]);
      return () => {
        stopKeyUX();
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      remoteStorageClient.getRemoteStorage();

      if (isOfflineModeEnabled()) {
        serviceWorkerManager.register();
      }

      const setThemeColor = () => {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
          themeColorMeta = document.createElement("meta");
          themeColorMeta.setAttribute("name", "theme-color");
          document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute("content", "#ffffff");
      };

      setThemeColor();

      const observer = new MutationObserver(() => setThemeColor());
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      const updateWidgetVisibility = () => {
        const widget = document.querySelector("remotestorage-widget");
        if (widget) {
          const isSettingsPage = activePath === "/settings";
          if (isSettingsPage) {
            (widget as HTMLElement).style.setProperty("display", "block", "important");
            (widget as HTMLElement).style.setProperty("visibility", "visible", "important");
            (widget as HTMLElement).style.setProperty("opacity", "1", "important");
            (widget as HTMLElement).style.setProperty("pointer-events", "auto", "important");
          } else {
            (widget as HTMLElement).style.setProperty("display", "none", "important");
            (widget as HTMLElement).style.setProperty("visibility", "hidden", "important");
            (widget as HTMLElement).style.setProperty("opacity", "0", "important");
            (widget as HTMLElement).style.setProperty("pointer-events", "none", "important");
          }
        }
      };

      const widgetInterval = setInterval(updateWidgetVisibility, 100);

      return () => {
        observer.disconnect();
        clearInterval(widgetInterval);
      };
    }
  }, [activePath]);

  return (
    <StandaloneTasksProvider>
    <CurrentActivityContext.Provider value={currentActivity}>
      <JobContextProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <header className="hidden md:flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <div className="flex-1" />
              {activePath === "/" && (
                <button
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("openTaskForm"));
                    }
                  }}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add Task</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </button>
              )}
            </header>
            <div
              className="flex-1 py-0 min-w-0 relative h-full overflow-hidden"
              style={{ maxWidth: "100%", overflowX: "hidden" }}
            >
              <div className="mx-auto h-full relative" style={{ maxWidth: "100%", overflowX: "hidden" }}>
                <div
                  style={{ viewTransitionName: "page", maxWidth: "100%", overflowX: "hidden" } as React.CSSProperties}
                  className="h-full w-full overflow-y-auto overflow-x-hidden bg-background px-4"
                >
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="bottom-center" offset={100} richColors />
        </ThemeProvider>
      </JobContextProvider>
    </CurrentActivityContext.Provider>
    </StandaloneTasksProvider>
  );
}
