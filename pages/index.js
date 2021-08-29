import Head from "next/head";
import { useJobContext } from "../components/Job/Context";
import JobList from "../components/Job/List";
import JobListItem from "../components/Job/ListItem";
import Sidebar from "../components/Sidebar";
import TaskListItem from "../components/Tasks/Item";
import TaskList from "../components/Tasks/List";

export default function Home() {
  const { jobs, selected } = useJobContext();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen">
      <Head>
        <title>Leptum</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex row gap-10 w-full">
        <Sidebar>
          {jobs.map((job, i) => (
            <JobListItem key={job.cron + "-" + i} job={job} />
          ))}
        </Sidebar>
        <TaskList>
          {jobs
            .find((job) => job.cron === selected)
            ?.tasks.map((task, i) => (
              <TaskListItem key={task.name + "-" + i} task={task} index={i} />
            ))}
        </TaskList>
      </div>
    </div>
  );
}
