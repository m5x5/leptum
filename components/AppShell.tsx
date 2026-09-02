"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import AppSidebar from "./Sidebar/new";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { Spinner } from "./ui/spinner";
import { PlusIcon, FireIcon } from "@heroicons/react/solid";
import { startKeyUX, hotkeyKeyUX, pressKeyUX, getHotKeyHint, likelyWithKeyboard } from "keyux";
import { CurrentActivityContext } from "./CurrentActivityContext";
import { StandaloneTasksProvider } from "./StandaloneTasksContext";
import { QueryProvider } from "../lib/query/QueryProvider";
import { fetchRoutines, fetchCompletions, invalidate as invalidateCollection, markSelfWrite } from "../lib/query/collections";
import { ImportSourceButton } from "./ui/import-source-button";
import { remoteStorageClient } from "../lib/remoteStorage";
import { getLastSolidIdp, getSolidSessionIfActive, solidLogin } from "../lib/solidAuth";
import { useRoutineCompletions } from "../utils/useRoutineCompletions";
import { serviceWorkerManager, isOfflineModeEnabled } from "../utils/serviceWorker";
import { Toaster } from "sonner";
import { Button } from "./ui/button";
// Run migration when app router bundle loads
import "../utils/migrateGoalIdToGoalIds";

// @ldo/solid-react constructs a SharedWorker at module init, which doesn't
// exist during Next.js's server-side prerender pass — load it client-only.
const BrowserSolidLdoProvider = dynamic(
  () => import("@ldo/solid-react").then((m) => m.BrowserSolidLdoProvider),
  { ssr: false }
);

/**
 * Sonner defaults to its light theme regardless of the page. Follow the
 * `dark` class that ThemeProvider toggles on <html>, so the toast matches
 * whichever theme is active — system, stored choice, or a live switch.
 */
function AppToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return (
    <Toaster
      position="bottom-center"
      offset={100}
      richColors
      theme={theme}
      className="toaster group"
      toastOptions={{
        // Default and loading toasts use the app's own surface tokens instead
        // of Sonner's neutral palette; richColors variants keep their colours.
        classNames: {
          toast: "group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-control",
          description: "group-[.toast]:text-muted-foreground",
        },
      }}
    />
  );
}

function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
}: {
  children: React.ReactNode;
  attribute?: "class";
  defaultTheme?: "system" | "light" | "dark";
  enableSystem?: boolean;
}) {
  useEffect(() => {
    const applyTheme = () => {
      const storedTheme = window.localStorage.getItem("theme") as "system" | "light" | "dark" | null;
      const theme = storedTheme ?? defaultTheme;
      const resolvedTheme =
        enableSystem && theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme;

      if (attribute === "class") {
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
      }
      document.documentElement.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
    };

    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "theme") applyTheme();
    };
    media.addEventListener("change", applyTheme);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("themeChanged", applyTheme);
    return () => {
      media.removeEventListener("change", applyTheme);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("themeChanged", applyTheme);
    };
  }, [attribute, defaultTheme, enableSystem]);

  return <>{children}</>;
}

function WeekNavigator() {
  const getMonday = useCallback((d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [currentWeekStart, setCurrentWeekStartState] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      // Check sessionStorage first
      const stored = sessionStorage.getItem('timeline-week-start');
      if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) return getMonday(parsed);
      }
      // Then check URL param
      const params = new URLSearchParams(window.location.search);
      const weekParam = params.get('week');
      if (weekParam) {
        const parsed = new Date(weekParam + 'T00:00:00');
        if (!isNaN(parsed.getTime())) return getMonday(parsed);
      }
    }
    return getMonday(new Date());
  });

  // Listen for weekChanged events from both this component and TimelinePageContent
  useEffect(() => {
    const handler = (e: Event) => {
      const date = (e as CustomEvent<Date>).detail;
      setCurrentWeekStartState(date);
    };
    window.addEventListener('weekChanged', handler);
    return () => window.removeEventListener('weekChanged', handler);
  }, []);

  const weekEndDate = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [currentWeekStart]);

  const isCurrentWeek = useMemo(() => {
    return currentWeekStart.getTime() === getMonday(new Date()).getTime();
  }, [currentWeekStart, getMonday]);

  const setWeekStart = useCallback((date: Date) => {
    const monday = getMonday(date);
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    // Update URL without triggering Next.js navigation (avoids re-render/scroll)
    const params = new URLSearchParams(window.location.search);
    params.set("week", key);
    window.history.replaceState(null, '', `/timeline?${params.toString()}`);
    sessionStorage.setItem('timeline-week-start', monday.toISOString());
    window.dispatchEvent(new CustomEvent('weekChanged', { detail: monday }));
  }, [getMonday]);

  const formatWeekRange = () => {
    const start = currentWeekStart;
    const end = weekEndDate;
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()}, ${start.getFullYear()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          const prev = new Date(currentWeekStart);
          prev.setDate(prev.getDate() - 7);
          setWeekStart(prev);
        }}
        className="p-2 rounded-full border border-border hover:bg-muted/50 transition text-muted-foreground hover:text-foreground"
        title="Previous week"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
      </button>
      <span className="text-sm font-medium text-foreground min-w-0 sm:min-w-[160px] text-center truncate">
        {formatWeekRange()}
      </span>
      <button
        onClick={() => {
          const next = new Date(currentWeekStart);
          next.setDate(next.getDate() + 7);
          setWeekStart(next);
        }}
        className="p-2 rounded-full border border-border hover:bg-muted/50 transition text-muted-foreground hover:text-foreground"
        title="Next week"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {!isCurrentWeek && (
        <button
          onClick={() => setWeekStart(new Date())}
          className="text-xs px-2 py-1 rounded-full border border-border hover:bg-muted/50 transition text-muted-foreground hover:text-foreground"
        >
          Today
        </button>
      )}
    </div>
  );
}

/**
 * Thin router: the landing page ("/") is pre-login and shouldn't pay for the
 * dashboard's mount-time work (Solid init, routine completions
 * fetch, keyux hotkey engine, theme-color MutationObserver) — none of that
 * can run before the LCP paint without delaying it. Routing to a genuinely
 * separate component, rather than an early-return inside one, means those
 * hooks are never mounted for landing visitors at all.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePath = pathname?.split("?")[0].split("#")[0] ?? "/";
  const isLanding = activePath === "/";
  const isSettings = activePath === "/settings";
  const [solidChecked, setSolidChecked] = useState(false);
  const [solidWebId, setSolidWebId] = useState<string | null>(null);
  const [solidIdp, setSolidIdp] = useState(() => getLastSolidIdp());
  const [solidConnecting, setSolidConnecting] = useState(false);
  const [solidError, setSolidError] = useState<string | null>(null);

  useEffect(() => {
    if (isLanding || isSettings) return;
    let cancelled = false;
    // If the pod/IdP hangs, fall through to the connect screen instead of a
    // blank page forever. Generous because in `next dev` the first call also
    // compiles the OIDC client chunk on demand, which can take a while.
    const deadline = new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000));
    Promise.race([getSolidSessionIfActive(), deadline])
      .then((session) => {
        if (cancelled) return;
        setSolidWebId(session?.webId ?? null);
      })
      .catch(() => {
        if (!cancelled) setSolidWebId(null);
      })
      .finally(() => {
        if (!cancelled) setSolidChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLanding, isSettings]);

  if (isLanding) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppToaster />
        {children}
      </ThemeProvider>
    );
  }

  if (!isSettings && !solidChecked) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
          <Spinner className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking your Solid session…</p>
        </div>
        <AppToaster />
      </ThemeProvider>
    );
  }

  if (!isSettings && !solidWebId) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
          <section className="w-full max-w-md border border-border rounded-control bg-card p-5 shadow-sm">
            <h1 className="text-lg font-semibold text-foreground">Connect Solid Pod</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Leptum now stores data in your Solid pod. Connect before opening the app.
            </p>
            <label htmlFor="solid-gate-idp" className="mt-4 block text-xs text-muted-foreground">
              Identity Provider URL
            </label>
            <input
              id="solid-gate-idp"
              type="text"
              value={solidIdp}
              onChange={(event) => setSolidIdp(event.target.value)}
              placeholder="https://your-pod-server/"
              className="mt-1 px-3 py-2.5 w-full h-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-900 text-inherit outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-solid focus:outline-gray-900 dark:focus:outline-white box-border text-sm"
            />
            {solidError && (
              <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{solidError}</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={solidConnecting}
                onClick={async () => {
                  const idp = solidIdp.trim();
                  if (!idp) {
                    setSolidError("Enter your Solid Identity Provider URL.");
                    return;
                  }
                  setSolidConnecting(true);
                  setSolidError(null);
                  try {
                    await solidLogin(idp);
                  } catch (error) {
                    setSolidError(error instanceof Error ? error.message : String(error));
                    setSolidConnecting(false);
                  }
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {solidConnecting ? "Connecting..." : "Connect with Solid"}
              </button>
              <a href="/settings" className="px-4 py-2 text-sm border border-border rounded-full font-medium hover:bg-accent transition-colors text-foreground">
                Settings
              </a>
            </div>
          </section>
        </main>
        <AppToaster />
      </ThemeProvider>
    );
  }

  return (
    <QueryProvider>
      <BrowserSolidLdoProvider>
        <FullAppShell>{children}</FullAppShell>
      </BrowserSolidLdoProvider>
    </QueryProvider>
  );
}

function FullAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activePath = pathname?.split("?")[0].split("#")[0] ?? "/";
  const isDashboard = activePath === "/app";
  const [activeHash, setActiveHash] = useState("");
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const { getStreaksForRoutine } = useRoutineCompletions();
  const showUpStreak = isDashboard ? getStreaksForRoutine("show-up-routine").currentStreak : 0;
  const [currentActivity, setCurrentActivity] = useState<{
    name: string;
    startTime: number;
    goalId?: string;
  } | null>(null);

  // Load current activity for the sidebar tracking pill, shown on every route.
  useEffect(() => {
    const loadCurrentActivity = async () => {
      try {
        const impacts = await remoteStorageClient.getImpacts();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayImpacts = impacts.filter((impact: { date: number }) => impact.date >= todayStart.getTime());
        todayImpacts.sort((a: { date: number }, b: { date: number }) => a.date - b.date);

        if (todayImpacts.length > 0) {
          const lastImpact = todayImpacts[todayImpacts.length - 1];
          const hasEnded = lastImpact.endTime != null && lastImpact.endTime <= Date.now();
          if (!hasEnded) {
            setCurrentActivity({
              name: lastImpact.activity,
              startTime: lastImpact.date,
              goalId: lastImpact.goalId,
            });
          } else {
            setCurrentActivity(null);
          }
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
  }, []);

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
      if (!isDashboard) return;
      const today = new Date().toISOString().split("T")[0];
      const lastShowUpDate = localStorage.getItem("leptum_show_up_date");
      if (lastShowUpDate === today) return;

      try {
        const routines = await fetchRoutines();
        let showUpRoutine = routines.find((r) => r.isShowUpRoutine);

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
          markSelfWrite('routines');
          await remoteStorageClient.saveRoutine(showUpRoutine);
          void invalidateCollection('routines');
        }

        const completions = await fetchCompletions();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const completedToday = completions.some(
          (c) =>
            c.routineId === showUpRoutine?.id && c.completedAt >= todayStart.getTime()
        );

        if (!completedToday) {
          const completion = {
            routineId: showUpRoutine.id,
            routineInstanceId: `${showUpRoutine.id}-${Date.now()}`,
            routineName: showUpRoutine.name,
            completedAt: Date.now(),
            taskCount: 0,
          };
          markSelfWrite('completions');
          await remoteStorageClient.addRoutineCompletion(completion);
          void invalidateCollection('completions');
        }

        localStorage.setItem("leptum_show_up_date", today);
      } catch (error) {
        console.error("Failed to initialize Show Up routine:", error);
      }
    };

    initShowUpRoutine();
  }, [isDashboard]);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem('showKeyboardShortcuts');
        setShowKeyboardHints(stored !== null ? stored === 'true' : false);
      }
    });
    const handleChange = () => {
      const stored = localStorage.getItem('showKeyboardShortcuts');
      setShowKeyboardHints(stored !== null ? stored === 'true' : false);
    };
    window.addEventListener('keyboardShortcutsChanged', handleChange);
    if (typeof window !== "undefined") {
      const stopKeyUX = startKeyUX(window, [hotkeyKeyUX(), pressKeyUX("is-pressed")]);
      return () => {
        stopKeyUX();
        window.removeEventListener('keyboardShortcutsChanged', handleChange);
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
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

      return () => {
        observer.disconnect();
      };
    }
  }, [activePath]);

  return (
    <StandaloneTasksProvider>
    <CurrentActivityContext.Provider value={currentActivity}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <header className="hidden md:flex h-14 shrink-0 items-center gap-2 px-4">
              <SidebarTrigger />
              {(() => {
                const pageNames: Record<string, string> = {
                  "/app": "Home",
                  "/timeline": "Timeline",
                  "/impact": "Wellbeing",
                  "/routines": "Routines",
                  "/goals": "Goals",
                  "/settings": "Settings",
                  "/health": "Health",
                  "/about": "About",
                };
                const pageName = activePath.startsWith("/day/") ? "Day View" : pageNames[activePath];
                return (
                  <div className="flex items-center gap-1.5 relative min-w-0">
                    <span className="text-sm font-semibold truncate">{pageName ?? ""}</span>
                  </div>
                );
              })()}
              <div className="flex-1" />
              {isDashboard && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("openStreakSheet"));
                      }
                    }}
                    className="gap-1.5 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15 text-foreground cursor-pointer"
                    title="Show up streak"
                  >
                    <FireIcon className="text-orange-500" />
                    <span className="tabular-nums">{showUpStreak}</span>
                  </Button>
                  <Button size="sm"
                    type="button"
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("openTaskForm"));
                      }
                    }}
                    className="md:px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground/60"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Add Task</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="hidden md:inline px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </Button>
                </>
              )}
              {activePath === "/timeline" && (
                <>
                  <div id="timeline-header-slot" className="flex items-center gap-2 min-w-0" />
                  <Suspense><WeekNavigator /></Suspense>
                  <div id="timeline-header-actions-slot" className="flex items-center gap-2 min-w-0" />
                  <ImportSourceButton
                    onActivityWatch={() => window.dispatchEvent(new CustomEvent("openActivityWatchImport"))}
                    onGoogleCalendar={() => window.dispatchEvent(new CustomEvent("openGCalImport"))}
                  />
                  <Button size="sm"
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("openAddActivity"));
                      }
                    }}
                    className="md:px-4 cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Add Activity</span>
                    {showKeyboardHints && typeof window !== "undefined" && (
                      <kbd className="hidden md:inline px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                        {getHotKeyHint(window, "n")}
                      </kbd>
                    )}
                  </Button>
                </>
              )}
              {activePath === "/goals" && (
                <Button size="sm"
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("openAddGoalCategory"));
                    }
                  }}
                  className="md:px-4 cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Goal Category</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="hidden md:inline px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </Button>
              )}
              {activePath === "/routines" && (
                <Button size="sm"
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("openCreateRoutine"));
                    }
                  }}
                  className="md:px-4 cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">New Routine</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="hidden md:inline px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </Button>
              )}
              {activePath === "/impact" && (
                <div id="impact-header-slot" className="flex items-center gap-2 min-w-0" />
              )}
              {activePath === "/impact" && (
                <Button size="sm"
                  aria-keyshortcuts="n"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent(activeHash === "insights" ? "openAddInsight" : "openAddLog")
                      );
                    }
                  }}
                  className="md:px-4 cursor-pointer"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">{activeHash === "insights" ? "Add Insight" : "Add Log"}</span>
                  {showKeyboardHints && typeof window !== "undefined" && (
                    <kbd className="hidden md:inline px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                      {getHotKeyHint(window, "n")}
                    </kbd>
                  )}
                </Button>
              )}
            </header>
            <div
              className="flex-1 py-0 min-w-0 relative overflow-hidden md:border-t md:border-l md:rounded-tl-xl flex flex-col"
              style={{ maxWidth: "100%", overflowX: "hidden" }}
            >
              <div className="mx-auto flex-1 min-h-0 relative w-full" style={{ maxWidth: "100%", overflowX: "hidden" }}>
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
        {/* DialRoot hidden for now */}
        <AppToaster />
        </ThemeProvider>
    </CurrentActivityContext.Provider>
    </StandaloneTasksProvider>
  );
}
