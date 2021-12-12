import Head from "next/head";
import CreationBar from "../components/CreationBar";
import { useJobContext } from "../components/Job/Context";
import JobListItem from "../components/Job/ListItem";
import { DbJob, Habit } from "../components/Job/api";
import Sidebar from "../components/Sidebar";
import TaskListItem from "../components/Tasks/Item";
import TaskList from "../components/Tasks/List";
import { isCronValid, sortObjectsByDueDate } from "../utils/cron";

export default function Home() {
  const { jobs, selected } = useJobContext();

  return (
    <>
      <Head>
        <title>Leptum</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Sidebar className="flex-grow rounded-xl">
        {jobs
          .sort(sortObjectsByDueDate)
          .map((job: DbJob, i: number) => (
            <JobListItem key={job.cron + "-" + i} job={job} isValid={isCronValid(job)} />
          ))}
      </Sidebar>
      <div className="flex-grow overflow-y-auto">
        <CreationBar />
        <TaskList>
          {jobs
            .find((job: DbJob) => job.cron === selected)
            ?.habits.map((habit: Habit, i: number) => (
              <TaskListItem key={habit.name + "-" + i} task={habit} index={i} />
            ))}
        </TaskList>
      </div>
    </>
  );
}
