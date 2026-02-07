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
import { HighlightedMentions } from "./ui/mention-input";
import { remoteStorageClient } from "../lib/remoteStorage";
import { serviceWorkerManager, isOfflineModeEnabled } from "../utils/serviceWorker";
import { Toaster } from "sonner";
// Run migration when app router bundle loads
import "../utils/migrateGoalIdToGoalIds";

function formatDurationStatic(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function LiveDuration({ baseMs = 0, startTime }: { baseMs?: number; startTime?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const liveOffset = startTime ? now - startTime : 0;
  return <>{formatDurationStatic(baseMs + liveOffset)}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePath = pathname?.split("?")[0].split("#")[0] ?? "/";
  const [activeHash, setActiveHash] = useState("");
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

  // Track hash for impact page (Add Log vs Add Insight)
  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(typeof window !== "undefined" ? window.location.hash.slice(1) || "" : "");
    };
    handleHashChange();
    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  // Initialize and auto-complete "Show Up" routine
  useEffect(() => {
    const initShowUpRoutine = async () => {
      if (typeof window === "undefined") return;
      const today = new Date().toISOString().split("T")[0];
      const lastShowUpDate = localStorage.getItem("leptum_show_up_date");
      if (lastShowUpDate === today) return;

      try {
        const routines = await remoteStorageClient.getRoutines();
        let showUpRoutine = (routines as any[]).find((r: any) => r.isShowUpRoutine);

        if (!showUpRoutine) {
          showUpRoutine = {
            id: "show-up-routine",
            name: "Show Up",
            cron: "0 0 * * *",
            status: "pending",
            index: 999,
            isShowUpRoutine: true,
            tasks: [],
          };
          await remoteStorageClient.saveRoutine(showUpRoutine);
        }

        const completions = await remoteStorageClient.getRoutineCompletions();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const completedToday = (completions as any[]).some(
          (c: any) =>
            c.routineId === showUpRoutine.id && c.completedAt >= todayStart.getTime()
        );

        if (!completedToday) {
          const completion = {
            routineId: showUpRoutine.id,
            routineInstanceId: `${showUpRoutine.id}-${Date.now()}`,
            routineName: showUpRoutine.name,
            completedAt: Date.now(),
            taskCount: 0,
          };
          await remoteStorageClient.addRoutineCompletion(completion);
        }

        localStorage.setItem("leptum_show_up_date", today);
      } catch (error) {
        console.error("Failed to initialize Show Up routine:", error);
      }
    };

    initShowUpRoutine();
  }, []);

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
              {activePath === "/" && currentActivity && (
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-primary">
                    <HighlightedMentions
                      text={currentActivity.name}
                      mentionClassName="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold"
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm font-semibold text-primary">
                    <LiveDuration startTime={currentActivity.startTime} />
                  </span>
                </div>
              )}
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
              {activePath === "/timeline" && (
                <button
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("openAddActivity"));
                    }
                  }}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add Activity</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </button>
              )}
              {activePath === "/goals" && (
                <button
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("openAddGoalCategory"));
                    }
                  }}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add Goal Category</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </button>
              )}
              {activePath === "/routines" && (
                <button
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("openCreateRoutine"));
                    }
                  }}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>New Routine</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </button>
              )}
              {activePath === "/impact" && (
                <button
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent(activeHash === "insights" ? "openAddInsight" : "openAddLog")
                      );
                    }
                  }}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>{activeHash === "insights" ? "Add Insight" : "Add Log"}</span>
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
