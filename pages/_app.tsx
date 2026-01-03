import "tailwindcss/tailwind.css";
import { JobContextProvider } from "../components/Job/Context";
import AppSidebar from "../components/Sidebar/new";
import "../styles/global.css";
import { ThemeProvider } from "next-themes"
import { AppProps, AppContext } from "next/app"
import { useEffect } from "react"
import { remoteStorageClient } from "../lib/remoteStorage"
import { serviceWorkerManager, isOfflineModeEnabled } from "../utils/serviceWorker"
import App from "next/app"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar"

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize RemoteStorage client on app load (sync happens automatically once connected)
    // Widget will only be displayed on the settings page
    if (typeof window !== 'undefined') {
      console.log('Initializing RemoteStorage client');
      remoteStorageClient.getRemoteStorage(); // Ensures client is initialized
      
      // Register service worker for offline support if enabled
      if (isOfflineModeEnabled()) {
        serviceWorkerManager.register();
      }
      
      // Force theme-color to white for Android PWA (overrides Material You dynamic colors)
      // This ensures the system UI (status bar, navigation bar) stays white
      const setThemeColor = () => {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.setAttribute('name', 'theme-color');
          document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute('content', '#ffffff');
      };
      
      // Set immediately on mount
      setThemeColor();
      
      // Also update when theme changes (for next-themes dark/light mode switching)
      const observer = new MutationObserver(() => {
        setThemeColor();
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Cleanup observer on unmount
      return () => {
        observer.disconnect();
      };
    }
  }, []);

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
              <div className="flex-1 px-4 pb-20 md:pb-4 overflow-y-auto overflow-x-hidden min-w-0" style={{ overscrollBehavior: 'none' }}>
                <div className="mx-auto my-4">
                  <Component {...pageProps} />
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
