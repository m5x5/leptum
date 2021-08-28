import "tailwindcss/tailwind.css";
import { JobContextProvider } from "../components/Job/Context";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <JobContextProvider>
        <Component {...pageProps} />
      </JobContextProvider>
    </>
  );
}

export default MyApp;
