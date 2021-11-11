import "tailwindcss/tailwind.css";
import { JobContextProvider } from "../components/Job/Context";
import NewSidebar from "../components/Sidebar/new";
import "../styles/global.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <JobContextProvider>
        <div className="w-full h-full bg-gray-900 text-white flex md:flex-row flex-col">
          <NewSidebar />
          <div className="flex-grow p-4 md:h-screen overflow-y-auto justify-center">
            <div className="mx-auto md:max-w-4xl">
              <Component {...pageProps} />
            </div>
          </div>
        </div>
      </JobContextProvider>
    </>
  );
}

export default MyApp;
