import "tailwindcss/tailwind.css";
import { JobContextProvider } from "../components/Job/Context";
import AppSidebar from "../components/Sidebar/new";
import "../styles/global.css";
import "../styles/rich-text-editor.css";
import { ThemeProvider } from "next-themes"
import { AppProps, AppContext } from "next/app"
import { useEffect, useState, useRef, useLayoutEffect } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/router"
import { remoteStorageClient } from "../lib/remoteStorage"
import { serviceWorkerManager, isOfflineModeEnabled } from "../utils/serviceWorker"
import App from "next/app"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar"
import { cn } from "../lib/utils"

const PAGE_ORDER = ["/", "/timeline", "/impact", "/routines", "/goals", "/settings"];

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activePath, setActivePath] = useState(router.asPath.split('?')[0].split('#')[0]);
  const [cache, setCache] = useState<Record<string, { Component: any, props: any }>>({});

  useEffect(() => {
    setMounted(true);
    const initialPath = router.asPath.split('?')[0].split('#')[0];
    setCache(prev => ({
      ...prev,
      [initialPath]: { Component, props: pageProps }
    }));
  }, []);

  // Handle transitions and caching
  useEffect(() => {
    if (!mounted) return;

    const newPath = router.asPath.split('?')[0].split('#')[0];
    if (newPath === activePath) {
      // Just update props for current page
      setCache(prev => ({
        ...prev,
        [newPath]: { Component, props: pageProps }
      }));
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
  }, [router.asPath, Component, pageProps, mounted]);

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
              </header>
              <div className="flex-1 py-4 pb-20 md:pb-4 min-w-0 relative h-full overflow-hidden">
                <div className="mx-auto h-full relative">
                  {!mounted ? (
                    <div style={{ viewTransitionName: 'page' } as any} className="h-full px-4 overflow-x-hidden">
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
                          } as any}
                        >
                          <CachedComponent {...props} />
                        </div>
                      ))}
                      {/* Ensure current page is always rendered even if not in cache yet */}
                      {activePath && !cache[activePath] && (
                        <div style={{ viewTransitionName: 'page' } as any} className="h-full w-full relative overflow-y-auto overflow-x-hidden bg-background px-4">
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
