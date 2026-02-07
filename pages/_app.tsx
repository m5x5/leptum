import { JobContextProvider } from "../components/Job/Context";
import AppSidebar from "../components/Sidebar/new";
import "../styles/global.css";
import "../styles/rich-text-editor.css";
import { ThemeProvider } from "next-themes"
import { AppProps, AppContext } from "next/app"
import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/router"
import { remoteStorageClient } from "../lib/remoteStorage"
import { serviceWorkerManager, isOfflineModeEnabled } from "../utils/serviceWorker"
// Import migration to run automatically on first load
import "../utils/migrateGoalIdToGoalIds"
import App from "next/app"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar"
import { cn } from "../lib/utils"
import { PlusIcon } from "@heroicons/react/solid"
import { startKeyUX, hotkeyKeyUX, pressKeyUX, getHotKeyHint, likelyWithKeyboard } from "keyux"
import { HighlightedMentions } from "../components/ui/mention-input"

const PAGE_ORDER = ["/", "/timeline", "/impact", "/routines", "/goals", "/settings"];

// Format duration in human readable form
function formatDurationStatic(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Self-contained timer component to avoid re-rendering the entire page every second
function LiveDuration({ baseMs = 0, startTime }: { baseMs?: number; startTime?: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startTime) return; // No interval needed if no live tracking
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const liveOffset = startTime ? now - startTime : 0;
  return <>{formatDurationStatic(baseMs + liveOffset)}</>;
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [activePath, setActivePath] = useState(router.asPath.split('?')[0].split('#')[0]);
  const [activeHash, setActiveHash] = useState(router.asPath.split('#')[1] || '');
  const [cache, setCache] = useState<Record<string, { Component: any, props: any }>>({});
  const [currentActivity, setCurrentActivity] = useState<{name: string, startTime: number, goalId?: string} | null>(null);

  // Load current activity for tracking pill in header
  useEffect(() => {
    const loadCurrentActivity = async () => {
      if (activePath !== '/') {
        setCurrentActivity(null);
        return;
      }
      
      try {
        const impacts = await remoteStorageClient.getImpacts();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayImpacts = impacts.filter((impact: any) => impact.date >= todayStart.getTime());
        todayImpacts.sort((a: any, b: any) => a.date - b.date);

        if (todayImpacts.length > 0) {
          const lastImpact = todayImpacts[todayImpacts.length - 1];
          setCurrentActivity({
            name: lastImpact.activity,
            startTime: lastImpact.date,
            goalId: lastImpact.goalId
          });
        } else {
          setCurrentActivity(null);
        }
      } catch (error) {
        console.error("Failed to load current activity:", error);
      }
    };

    loadCurrentActivity();
    
    // Listen for impact updates
    const handleImpactChange = () => {
      loadCurrentActivity();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('impactsUpdated', handleImpactChange);
      return () => {
        window.removeEventListener('impactsUpdated', handleImpactChange);
      };
    }
  }, [activePath]);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    const initialPath = router.asPath.split('?')[0].split('#')[0];
    queueMicrotask(() => setCache(prev => ({
      ...prev,
      [initialPath]: { Component, props: pageProps }
    })));

    // Initialize KeyUX for keyboard shortcuts
    if (typeof window !== 'undefined') {
      queueMicrotask(() => setShowKeyboardHints(likelyWithKeyboard(window)));
      const stopKeyUX = startKeyUX(window, [
        hotkeyKeyUX(),
        pressKeyUX('is-pressed')
      ]);
      return () => {
        stopKeyUX();
      };
    }
  }, [router.asPath, Component, pageProps]);

  // Handle transitions and caching
  useEffect(() => {
    if (!mounted) return;

    const newPath = router.asPath.split('?')[0].split('#')[0];
    const newHash = router.asPath.split('#')[1] || '';
    queueMicrotask(() => setActiveHash(newHash));

    if (newPath === activePath) {
      // Just update props for current page
      queueMicrotask(() => setCache(prev => ({
        ...prev,
        [newPath]: { Component, props: pageProps }
      })));
      return;
    }

    const performTransition = () => {
      // Set direction
      const fromIndex = PAGE_ORDER.indexOf(activePath);
      const toIndex = PAGE_ORDER.indexOf(newPath);
      
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const direction = toIndex > fromIndex ? "slide-left" : "slide-right";
        document.documentElement.setAttribute("data-transition", direction);
      } else {
        document.documentElement.removeAttribute("data-transition");
      }

      flushSync(() => {
        setCache(prev => ({
          ...prev,
          [newPath]: { Component, props: pageProps }
        }));
        setActivePath(newPath);
      });
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      const transition = (document as any).startViewTransition(() => {
        performTransition();
      });
      
      transition.finished.finally(() => {
        document.documentElement.removeAttribute("data-transition");
      });
    } else {
      performTransition();
    }
  }, [router.asPath, Component, pageProps, mounted, activePath]);

  // Track hash changes for impact page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '';
      setActiveHash(hash);
    };
    handleHashChange(); // Set initial hash
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Initialize and auto-complete "Show Up" routine
  useEffect(() => {
    const initShowUpRoutine = async () => {
      if (typeof window === 'undefined') return;

      // Check localStorage to avoid redundant checks on same day
      const today = new Date().toISOString().split('T')[0];
      const lastShowUpDate = localStorage.getItem('leptum_show_up_date');
      if (lastShowUpDate === today) return;

      try {
        // Get or create Show Up routine
        const routines = await remoteStorageClient.getRoutines();
        let showUpRoutine = (routines as any[]).find((r: any) => r.isShowUpRoutine);

        if (!showUpRoutine) {
          // Create the Show Up routine
          showUpRoutine = {
            id: 'show-up-routine',
            name: 'Show Up',
            cron: '0 0 * * *', // Daily at midnight
            status: 'pending',
            index: 999, // Put at the end
            isShowUpRoutine: true,
            tasks: []
          };
          await remoteStorageClient.saveRoutine(showUpRoutine);
        }

        // Check if already completed today
        const completions = await remoteStorageClient.getRoutineCompletions();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const completedToday = (completions as any[]).some((c: any) =>
          c.routineId === showUpRoutine.id &&
          c.completedAt >= todayStart.getTime()
        );

        if (!completedToday) {
          // Mark as complete
          const completion = {
            routineId: showUpRoutine.id,
            routineInstanceId: `${showUpRoutine.id}-${Date.now()}`,
            routineName: showUpRoutine.name,
            completedAt: Date.now(),
            taskCount: 0
          };
          await remoteStorageClient.addRoutineCompletion(completion);
        }

        // Store today's date to avoid redundant checks
        localStorage.setItem('leptum_show_up_date', today);
      } catch (error) {
        console.error('Failed to initialize Show Up routine:', error);
      }
    };

    initShowUpRoutine();
  }, []);

  useEffect(() => {
    // Initialize RemoteStorage client on app load
    if (typeof window !== 'undefined') {
      remoteStorageClient.getRemoteStorage();
      
      if (isOfflineModeEnabled()) {
        serviceWorkerManager.register();
      }
      
      const setThemeColor = () => {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.setAttribute('name', 'theme-color');
          document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute('content', '#ffffff');
      };
      
      setThemeColor();
      
      const observer = new MutationObserver(() => setThemeColor());
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Control RemoteStorage widget visibility based on path
      const updateWidgetVisibility = () => {
        const widget = document.querySelector('remotestorage-widget');
        if (widget) {
          const isSettingsPage = router.asPath.split('?')[0].split('#')[0] === '/settings';
          if (isSettingsPage) {
            (widget as HTMLElement).style.setProperty('display', 'block', 'important');
            (widget as HTMLElement).style.setProperty('visibility', 'visible', 'important');
            (widget as HTMLElement).style.setProperty('opacity', '1', 'important');
            (widget as HTMLElement).style.setProperty('pointer-events', 'auto', 'important');
          } else {
            (widget as HTMLElement).style.setProperty('display', 'none', 'important');
            (widget as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
            (widget as HTMLElement).style.setProperty('opacity', '0', 'important');
            (widget as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          }
        }
      };

      const widgetInterval = setInterval(updateWidgetVisibility, 100);
      
      return () => {
        observer.disconnect();
        clearInterval(widgetInterval);
      };
    }
  }, [router.asPath]);

  return (
    <>
      <JobContextProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset>
              <header className="hidden md:flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger />
                <div className="flex-1" />
                {activePath === '/' && currentActivity && (
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary rounded-full px-4 py-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
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
                {activePath === '/' && (
                  <button
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('openTaskForm'));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Task</span>
                    {showKeyboardHints && typeof window !== 'undefined' && (
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                        {getHotKeyHint(window, 'n')}
                      </kbd>
                    )}
                  </button>
                )}
                {activePath === '/timeline' && (
                  <button
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('openAddActivity'));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Activity</span>
                    {showKeyboardHints && typeof window !== 'undefined' && (
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                        {getHotKeyHint(window, 'n')}
                      </kbd>
                    )}
                  </button>
                )}
                {activePath === '/goals' && (
                  <button
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('openAddGoalCategory'));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Goal Category</span>
                    {showKeyboardHints && typeof window !== 'undefined' && (
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                        {getHotKeyHint(window, 'n')}
                      </kbd>
                    )}
                  </button>
                )}
                {activePath === '/routines' && (
                  <button
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('openCreateRoutine'));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Routine</span>
                    {showKeyboardHints && typeof window !== 'undefined' && (
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                        {getHotKeyHint(window, 'n')}
                      </kbd>
                    )}
                  </button>
                )}
                {activePath === '/impact' && (
                  <button
                    aria-keyshortcuts="n"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent(activeHash === 'insights' ? 'openAddInsight' : 'openAddLog'));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>{activeHash === 'insights' ? 'Add Insight' : 'Add Log'}</span>
                    {showKeyboardHints && typeof window !== 'undefined' && (
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-primary-foreground/70 bg-primary-foreground/20 border border-primary-foreground/30 rounded">
                        {getHotKeyHint(window, 'n')}
                      </kbd>
                    )}
                  </button>
                )}
              </header>
              <div className="flex-1 py-4 pb-20 md:pb-4 min-w-0 relative h-full overflow-hidden" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <div className="mx-auto h-full relative" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                  {!mounted ? (
                    <div style={{ viewTransitionName: 'page', maxWidth: '100%', overflowX: 'hidden' } as any} className="h-full px-4 overflow-x-hidden">
                      <Component {...pageProps} />
                    </div>
                  ) : (
                    <>
                      {Object.entries(cache).map(([path, { Component: CachedComponent, props }]) => (
                        <div 
                          key={path} 
                          className={cn(
                            "h-full w-full overflow-y-auto overflow-x-hidden bg-background px-4",
                            path === activePath ? "relative z-10 visible" : "absolute inset-0 z-0 invisible pointer-events-none"
                          )}
                          style={{ 
                            viewTransitionName: path === activePath ? 'page' : 'none',
                            maxWidth: '100%',
                            overflowX: 'hidden'
                          } as any}
                        >
                          <CachedComponent {...props} />
                        </div>
                      ))}
                      {/* Ensure current page is always rendered even if not in cache yet */}
                      {activePath && !cache[activePath] && (
                        <div style={{ viewTransitionName: 'page', maxWidth: '100%', overflowX: 'hidden' } as any} className="h-full w-full relative overflow-y-auto overflow-x-hidden bg-background px-4">
                          <Component {...pageProps} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </JobContextProvider>
    </>
  )
}

// This is needed for Next.js custom App components
MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  return { ...appProps };
};

export default MyApp;
