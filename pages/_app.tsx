import "tailwindcss/tailwind.css";
import { JobContextProvider } from "../components/Job/Context";
import NewSidebar from "../components/Sidebar/new";
import "../styles/global.css";
import { ThemeProvider } from "next-themes"
import { AppProps, AppContext } from "next/app"
import { useEffect } from "react"
import { remoteStorageClient } from "../lib/remoteStorage"
import App from "next/app"

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize RemoteStorage widget after component mounts
    setTimeout(() => {
      remoteStorageClient.attachWidget('remotestorage-widget');
    }, 100);
  }, []);

  return (
    <>
      <JobContextProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="w-full h-full bg-background text-foreground flex md:flex-row flex-col">
            {/* RemoteStorage Widget Container */}
            <div id="remotestorage-widget" className="fixed top-4 right-4 z-50"></div>

            <NewSidebar />
            <div className="flex-grow px-4 pb-20 md:pb-4 md:h-screen overflow-y-auto">
              <div className="mx-auto my-4">
                <Component {...pageProps} />
              </div>
            </div>
          </div>
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
