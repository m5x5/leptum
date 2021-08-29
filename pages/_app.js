import "tailwindcss/tailwind.css";
import { JobContextProvider } from "../components/Job/Context";
import "../styles/global.css";

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
