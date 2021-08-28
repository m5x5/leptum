import Head from "next/head";
import { useJobContext } from "../components/Job/Context";
import JobList from "../components/Job/List";
import JobListItem from "../components/Job/ListItem";

export default function Home() {
  const { jobs } = useJobContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <JobList>
          {jobs.map((job) => (
            <JobListItem key={job.cron} job={job} />
          ))}
        </JobList>
      </div>
    </div>
  );
}
