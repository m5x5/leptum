import Head from "next/head";
import CreationBar from "../components/CreationBar";
import { useJobContext } from "../components/Job/Context";
import JobListItem from "../components/Job/ListItem";
import Sidebar from "../components/Sidebar";
import TaskListItem from "../components/Tasks/Item";
import TaskList from "../components/Tasks/List";
import { filterInvalidCron, sortObjectsByDueDate } from "../utils/cron";

export default function Home() {
  const { jobs, selected } = useJobContext();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen">
      <Head>
        <title>Leptum</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex row w-full h-screen overflow-y-auto">
        <Sidebar className="flex-grow">
          {jobs
            .filter(filterInvalidCron)
            .sort(sortObjectsByDueDate)
            .map((job, i) => (
              <JobListItem key={job.cron + "-" + i} job={job} />
            ))}
        </Sidebar>
        <div className="flex-grow px-8 h-screen overflow-y-auto">
          <CreationBar />
          <TaskList>
            {jobs
              .find((job) => job.cron === selected)
              ?.tasks.map((task, i) => (
                <TaskListItem key={task.name + "-" + i} task={task} index={i} />
              ))}
          </TaskList>
        </div>
      </div>
    </div>
  );
}
